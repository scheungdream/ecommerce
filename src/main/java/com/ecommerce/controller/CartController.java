package com.ecommerce.controller;

import com.ecommerce.model.Cart;
import com.ecommerce.model.User;
import com.ecommerce.service.CartService;
import com.ecommerce.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Cart>> getCart(Authentication authentication) {
        Long userId = getUserIdFromAuthentication(authentication);
        List<Cart> cartItems = cartService.getCartByUserId(userId);
        return ResponseEntity.ok(cartItems);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Integer>> getCartCount(Authentication authentication) {
        Long userId = getUserIdFromAuthentication(authentication);
        int count = cartService.getCartCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @GetMapping("/total")
    public ResponseEntity<Map<String, Double>> getCartTotal(Authentication authentication) {
        Long userId = getUserIdFromAuthentication(authentication);
        double total = cartService.getCartTotal(userId);
        return ResponseEntity.ok(Map.of("total", total));
    }

    @PostMapping("/add")
    public ResponseEntity<String> addToCart(
            Authentication authentication,
            @RequestParam Long productId,
            @RequestParam(defaultValue = "1") Integer quantity) {
        try {
            Long userId = getUserIdFromAuthentication(authentication);
            cartService.addToCart(userId, productId, quantity);
            return ResponseEntity.ok("Added to cart");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/update")
    public ResponseEntity<Cart> updateCart(
            Authentication authentication,
            @RequestParam Long productId,
            @RequestParam Integer quantity) {
        Long userId = getUserIdFromAuthentication(authentication);
        Cart cart = cartService.updateCartItem(userId, productId, quantity);
        return ResponseEntity.ok(cart);
    }

    @DeleteMapping("/remove/{productId}")
    public ResponseEntity<Void> removeFromCart(
            Authentication authentication,
            @PathVariable Long productId) {
        Long userId = getUserIdFromAuthentication(authentication);
        cartService.removeFromCart(userId, productId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(Authentication authentication) {
        Long userId = getUserIdFromAuthentication(authentication);
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateCart(Authentication authentication) {
        Long userId = getUserIdFromAuthentication(authentication);
        Map<String, Object> result = cartService.validateCart(userId);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/quantity/{productId}")
    public ResponseEntity<Map<String, Integer>> getCartItemQuantity(
            Authentication authentication,
            @PathVariable Long productId) {
        Long userId = getUserIdFromAuthentication(authentication);
        int quantity = cartService.getCartItemQuantity(userId, productId);
        return ResponseEntity.ok(Map.of("quantity", quantity));
    }

    @GetMapping("/exists/{productId}")
    public ResponseEntity<Map<String, Boolean>> isProductInCart(
            Authentication authentication,
            @PathVariable Long productId) {
        Long userId = getUserIdFromAuthentication(authentication);
        boolean exists = cartService.isProductInCart(userId, productId);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    private Long getUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not logged in");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            String username = userDetails.getUsername();
            User user = userService.getUserByUsername(username);
            return user.getId();
        }

        throw new RuntimeException("Unable to retrieve user information");
    }
}