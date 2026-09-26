package com.ecommerce.service.admin;

import com.ecommerce.model.Order;
import com.ecommerce.repository.admin.AdminOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private final AdminOrderRepository adminOrderRepository;

    public Page<Order> getAllOrders(String search, Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            return adminOrderRepository.searchOrdersMultiField(search.trim(), pageable);
        }
        return adminOrderRepository.findAll(pageable);
    }

    public Order getOrderById(Long id) {
        return adminOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    }

    @Transactional
    public Order updateOrder(Long id, Order updatedOrder) {
        Order existingOrder = getOrderById(id);

        if (updatedOrder.getReceiverName() != null) {
            existingOrder.setReceiverName(updatedOrder.getReceiverName());
        }
        if (updatedOrder.getReceiverPhone() != null) {
            existingOrder.setReceiverPhone(updatedOrder.getReceiverPhone());
        }
        if (updatedOrder.getTotalAmount() != null) {
            existingOrder.setTotalAmount(updatedOrder.getTotalAmount());
        }
        if (updatedOrder.getStatus() != null) {
            existingOrder.setStatus(updatedOrder.getStatus());
        }

        return adminOrderRepository.save(existingOrder);
    }

    @Transactional
    public void deleteOrder(Long id) {
        if (!adminOrderRepository.existsById(id)) {
            throw new RuntimeException("Product not found with id: " + id);
        }
        adminOrderRepository.deleteById(id);
    }

}
