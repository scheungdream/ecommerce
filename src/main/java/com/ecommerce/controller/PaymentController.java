package com.ecommerce.controller;

import com.ecommerce.model.Order;
import com.ecommerce.service.PaymentService;
import com.ecommerce.service.UserService;
import com.stripe.StripeClient;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {
    @Value("${stripe.publishable.key}")
    private String stripePublishableKey;
    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    private final PaymentService paymentService;
    private final UserService userService;

    @GetMapping("/get-publishable-key")
    public ResponseEntity<Map<String, String>> getPublishableKey() {
        return ResponseEntity.ok(Map.of("publishableKey", stripePublishableKey));
    }

    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(Authentication authentication) {
        try {
            Long userId = userService.getUserByUsername(authentication.getName()).getId();

            String clientSecret = paymentService.createOrGetPaymentIntent(userId);

            return ResponseEntity.ok(Map.of("client_secret", clientSecret));

        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to process payment: " + e.getMessage()));
        }
    }

    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> request, Authentication authentication) {
        String paymentIntentId = request.get("paymentIntentId");
        Long userId = userService.getUserByUsername(authentication.getName()).getId();

        try {
            PaymentIntent paymentIntent = new StripeClient(stripeSecretKey).v1().paymentIntents().retrieve(paymentIntentId);

            if (!"succeeded".equals(paymentIntent.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("status", "failed", "message", "Payment incomplete"));
            }

            Order order = paymentService.processOrder(paymentIntent, userId);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "paymentStatus", paymentIntent.getStatus(),
                    "orderNumber", order.getOrderNumber()
            ));

        } catch (IllegalStateException e) {
            paymentService.refundStripe(paymentIntentId);
            return ResponseEntity.badRequest().body(Map.of("status", "failed", "message", e.getMessage() + " Payment refunded."));
        } catch (StripeException e) {
            return ResponseEntity.internalServerError().body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

}
