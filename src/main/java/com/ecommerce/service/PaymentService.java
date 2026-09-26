package com.ecommerce.service;

import com.ecommerce.model.*;
import com.ecommerce.model.Product;
import com.ecommerce.repository.*;
import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.model.*;
import com.stripe.param.*;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.dao.DataAccessException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentService {
    @Value("${stripe.secret.key}")
    private String stripeSecretKey;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final CartRepository cartRepository;

    private static final ZoneId hkZone = ZoneId.of("Asia/Hong_Kong");

    public String getStripeCustomerId(Long userId) {
        try {
            StripeClient client = new StripeClient(stripeSecretKey);

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User Id not found: " + userId));

            if (user.getStripeCustomerId() != null && !user.getStripeCustomerId().isEmpty()) {
                return user.getStripeCustomerId();
            }

            CustomerCreateParams customerParams = CustomerCreateParams.builder()
                    .setEmail(user.getEmail())
                    .setName(user.getUsername())
                    .putMetadata("userId", String.valueOf(user.getId()))
                    .build();

            Customer customer = client.v1().customers().create(customerParams);

            user.setStripeCustomerId(customer.getId());
            userRepository.save(user);

            return customer.getId();
        }
        catch (StripeException e) {
            throw new RuntimeException(e);
        }
    }

    public String createOrGetPaymentIntent(Long userId) {
        List<Cart> cartItems = cartRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        for (Cart cart : cartItems) {
            if (cart.getProduct().getStock() < cart.getQuantity()) {
                throw new IllegalStateException("Product '" + cart.getProduct().getName() + "' is out of stock.");
            }
        }

        Long amountInCents = getAmountInCents(cartItems);

        try {
            StripeClient client = new StripeClient(stripeSecretKey);
            String stripeCustomerId = getStripeCustomerId(userId);

            PaymentIntentListParams listParams = PaymentIntentListParams.builder()
                    .setCustomer(stripeCustomerId)
                    .setLimit(5L)
                    .build();

            StripeCollection<PaymentIntent> existingIntents = client.v1().paymentIntents().list(listParams);

            Optional<PaymentIntent> reusableIntent = existingIntents.getData().stream()
                    .filter(pi -> "requires_payment_method".equals(pi.getStatus()))
                    .findFirst();

            if (reusableIntent.isPresent()) {
                PaymentIntent intent = reusableIntent.get();

                if (!intent.getAmount().equals(amountInCents)) {
                    PaymentIntentUpdateParams updateParams = PaymentIntentUpdateParams.builder()
                            .setAmount(amountInCents)
                            .build();
                    intent = client.v1().paymentIntents().update(intent.getId(), updateParams);
                }

                return intent.getClientSecret();
            }

            PaymentIntentCreateParams createParams = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("hkd")
                    .setCustomer(stripeCustomerId)
                    .setAutomaticPaymentMethods(
                            PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                    .setEnabled(true)
                                    .build()
                    )
                    .putMetadata("userId", userId.toString())
                    .build();

            PaymentIntent newIntent = client.v1().paymentIntents().create(createParams);
            return newIntent.getClientSecret();

        } catch (StripeException e) {
            throw new RuntimeException("Failed to process PaymentIntent", e);
        }
    }

    private static @NonNull Long getAmountInCents(List<Cart> carts) {
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (Cart cart : carts) {
            Product product = cart.getProduct();
            if (cart.getQuantity() > product.getStock()) {
                throw new RuntimeException("Product " + product.getName() + " has insufficient stock");
            }
            BigDecimal itemTotal = product.getPrice().multiply(new BigDecimal(cart.getQuantity()));
            totalAmount = totalAmount.add(itemTotal);
        }
        return totalAmount.multiply(new BigDecimal("100")).longValue();
    }

    @Retryable(
            retryFor = { DataAccessException.class },
            maxAttempts = 15,
            backoff = @Backoff(delay = 50, maxDelay = 300, random = true)
    )
    @Transactional(rollbackFor = Exception.class)
    public Order processOrder(PaymentIntent paymentIntent, Long userId) {
        String paymentIntentId = paymentIntent.getId();

        Optional<Order> existingOrder = orderRepository.findByPaymentId(paymentIntentId);
        if (existingOrder.isPresent()) {
            return existingOrder.get();
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Cart> cartItems = cartRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        List<Cart> sortedCartItems = cartItems.stream()
                .sorted(Comparator.comparing(c -> c.getProduct().getId()))
                .toList();

        BigDecimal total = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (Cart cart : sortedCartItems) {
            Product product = cart.getProduct();
            int quantity = cart.getQuantity();

            int updatedRows = productRepository.decreaseStockAtomic(product.getId(), quantity);
            if (updatedRows == 0) {
                throw new IllegalStateException("Product '" + product.getName() + "' is out of stock.");
            }

            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(quantity));

            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setProductName(product.getName());
            item.setProductImage(product.getImageUrl());
            item.setPrice(product.getPrice());
            item.setQuantity(quantity);
            item.setSubtotal(subtotal);

            orderItems.add(item);
            total = total.add(subtotal);
        }

        Order order = new Order();
        order.setOrderNumber(generateOrderNumber());
        order.setPaymentId(paymentIntentId);
        order.setUser(user);
        order.setPaymentMethod("CREDIT_CARD");
        order.setStatus("PAID");
        order.setTotalAmount(total);
        order.setOrderDate(LocalDateTime.now(hkZone));

        if (paymentIntent.getCreated() != null) {
            order.setPaidAt(LocalDateTime.ofInstant(Instant.ofEpochSecond(paymentIntent.getCreated()), hkZone));
        }

        applyShippingDetails(order, paymentIntent.getShipping());

        Order savedOrder = orderRepository.save(order);
        orderItems.forEach(item -> item.setOrder(savedOrder));
        orderItemRepository.saveAll(orderItems);

        cartRepository.deleteAll(cartItems);

        return savedOrder;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void refundStripe(String paymentIntentId) {
        try {
            StripeClient client = new StripeClient(stripeSecretKey);
            RefundCreateParams params = RefundCreateParams.builder()
                    .setPaymentIntent(paymentIntentId)
                    .build();

            client.v1().refunds().create(params);
        } catch (StripeException ignored) {}
    }

    private void applyShippingDetails(Order order, ShippingDetails shipping) {
        if (shipping == null) {
            order.setReceiverName("");
            order.setReceiverPhone("");
            order.setShippingAddress("No address provided");
            return;
        }

        order.setReceiverName(Optional.ofNullable(shipping.getName()).orElse(""));
        order.setReceiverPhone(Optional.ofNullable(shipping.getPhone()).orElse(""));

        if (shipping.getAddress() != null) {
            com.stripe.model.Address addr = shipping.getAddress();
            String fullAddress = String.join(" ",
                    Optional.ofNullable(addr.getLine1()).orElse(""),
                    Optional.ofNullable(addr.getLine2()).orElse(""),
                    Optional.ofNullable(addr.getCity()).orElse(""),
                    Optional.ofNullable(addr.getState()).orElse(""),
                    Optional.ofNullable(addr.getPostalCode()).orElse(""),
                    Optional.ofNullable(addr.getCountry()).orElse("")
            ).replaceAll("\\s+", " ").trim();

            order.setShippingAddress(fullAddress.isEmpty() ? "No address provided" : fullAddress);
        } else {
            order.setShippingAddress("No address provided");
        }
    }

    public String generateOrderNumber() {
        return "ORD" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

}
