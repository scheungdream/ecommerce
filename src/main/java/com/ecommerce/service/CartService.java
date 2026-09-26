package com.ecommerce.service;

import com.ecommerce.model.Cart;
import com.ecommerce.model.Product;
import com.ecommerce.model.User;
import com.ecommerce.repository.CartRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public List<Cart> getCartByUserId(Long userId) {
        User user = getUserById(userId);
        return cartRepository.findByUser(user);
    }

    public int getCartCount(Long userId) {
        User user = getUserById(userId);
        List<Cart> cartItems = cartRepository.findByUser(user);
        return cartItems.stream().mapToInt(Cart::getQuantity).sum();
    }

    public double getCartTotal(Long userId) {
        User user = getUserById(userId);
        List<Cart> cartItems = cartRepository.findByUser(user);
        return cartItems.stream()
                .mapToDouble(cart -> cart.getProduct().getPrice().doubleValue() * cart.getQuantity())
                .sum();
    }

    public int getCartItemQuantity(Long userId, Long productId) {
        User user = getUserById(userId);
        Cart cart = cartRepository.findByUserAndProductId(user, productId).orElse(null);
        return cart != null ? cart.getQuantity() : 0;
    }

    public boolean isProductInCart(Long userId, Long productId) {
        User user = getUserById(userId);
        return cartRepository.findByUserAndProductId(user, productId).isPresent();
    }

    @Transactional
    public void addToCart(Long userId, Long productId, Integer quantity) {
        User user = getUserById(userId);
        Product product = getProductById(productId);

        if (product.getStock() < quantity) {
            throw new IllegalArgumentException("Insufficient stock, current stock: " + product.getStock());
        }

        Cart cart = cartRepository.findByUserAndProductId(user, productId)
                .orElse(new Cart());

        if (cart.getQuantity() == null) {
            cart.setQuantity(0);
        }

        cart.setUser(user);
        cart.setProduct(product);
        cart.setQuantity(cart.getQuantity() + quantity);

        cartRepository.save(cart);
    }

    @Transactional
    public Cart updateCartItem(Long userId, Long productId, Integer quantity) {
        User user = getUserById(userId);
        Product product = getProductById(productId);

        if (product.getStock() < quantity) {
            throw new RuntimeException("Insufficient stock, current stock: " + product.getStock());
        }

        Cart cart = cartRepository.findByUserAndProductId(user, productId)
                .orElseThrow(() -> new RuntimeException("Product not found in cart"));

        if (quantity <= 0) {
            cartRepository.delete(cart);
            return null;
        }

        cart.setQuantity(quantity);
        return cartRepository.save(cart);
    }

    @Transactional
    public void removeFromCart(Long userId, Long productId) {
        User user = getUserById(userId);
        cartRepository.deleteByUserAndProductId(user, productId);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartRepository.deleteAllByUserId(userId);
    }

    public Map<String, Object> validateCart(Long userId) {
        User user = getUserById(userId);
        List<Cart> cartItems = cartRepository.findByUser(user);

        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> invalidItems = new java.util.ArrayList<>();
        boolean allValid = true;
        double total = 0;

        for (Cart cart : cartItems) {
            Product product = cart.getProduct();
            Map<String, Object> itemResult = new HashMap<>();
            itemResult.put("productId", product.getId());
            itemResult.put("productName", product.getName());
            itemResult.put("quantity", cart.getQuantity());
            itemResult.put("stock", product.getStock());

            if (product.getStock() < cart.getQuantity()) {
                itemResult.put("valid", false);
                itemResult.put("message", "Insufficient stock, current stock: " + product.getStock());
                allValid = false;
                invalidItems.add(itemResult);
            } else {
                itemResult.put("valid", true);
                total += product.getPrice().doubleValue() * cart.getQuantity();
            }
        }

        result.put("valid", allValid);
        result.put("total", total);
        result.put("invalidItems", invalidItems);
        result.put("itemCount", cartItems.size());

        return result;
    }

    private User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found, ID: " + userId));
    }

    private Product getProductById(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found, ID: " + productId));
    }
}