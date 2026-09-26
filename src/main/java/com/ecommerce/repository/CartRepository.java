package com.ecommerce.repository;

import com.ecommerce.model.Cart;
import com.ecommerce.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {

    List<Cart> findByUser(User user);

    List<Cart> findByUserId(Long userId);

    Optional<Cart> findByUserAndProductId(User user, Long productId);

    @Modifying
    @Transactional
    void deleteByUserAndProductId(User user, Long productId);

    @Modifying
    @Transactional
    void deleteAllByUserId(Long userId);
}