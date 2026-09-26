package com.ecommerce.service.admin;

import com.ecommerce.dto.admin.StockAdjustDTO;
import com.ecommerce.model.Product;
import com.ecommerce.repository.admin.AdminProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminProductService {

    private final AdminProductRepository adminProductRepository;

    public Page<Product> getAllProducts(String search, Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            return adminProductRepository.findByNameContainingIgnoreCase(search.trim(), pageable);
        }
        return adminProductRepository.findAll(pageable);
    }

    public Product getProductById(Long id) {
        return adminProductRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    }

    @Transactional
    public Product createProduct(Product product) {
        return adminProductRepository.save(product);
    }

    @Transactional
    public Product updateProduct(Long id, Product updatedProduct) {
        Product existingProduct = getProductById(id);

        if (updatedProduct.getName() != null) {
            existingProduct.setName(updatedProduct.getName());
        }
        if (updatedProduct.getCategory() != null) {
            existingProduct.setCategory(updatedProduct.getCategory());
        }
        if (updatedProduct.getPrice() != null) {
            existingProduct.setPrice(updatedProduct.getPrice());
        }
        if (updatedProduct.getStock() != null) {
            existingProduct.setStock(updatedProduct.getStock());
        }

        if (updatedProduct.getDescription() != null) {
            existingProduct.setDescription(updatedProduct.getDescription());
        }
        if (updatedProduct.getImageUrl() != null) {
            existingProduct.setImageUrl(updatedProduct.getImageUrl());
        }

        return adminProductRepository.save(existingProduct);
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!adminProductRepository.existsById(id)) {
            throw new RuntimeException("Product not found with id: " + id);
        }
        adminProductRepository.deleteById(id);
    }

    @Transactional
    public Product adjustStock(Long id, StockAdjustDTO dto) {
        if (dto.getQuantity() == null || dto.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be a positive number.");
        }

        Product product = adminProductRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        if (dto.getType() == StockAdjustDTO.Type.INCREASE) {
            int updatedRows = adminProductRepository.increaseStockAtomic(id, dto.getQuantity());
            if (updatedRows == 0) {
                throw new IllegalStateException("Failed to increase stock. Product may have been deleted.");
            }
        } else if (dto.getType() == StockAdjustDTO.Type.DECREASE) {
            int updatedRows = adminProductRepository.decreaseStockAtomic(id, dto.getQuantity());
            if (updatedRows == 0) {
                throw new IllegalStateException(
                        String.format("Insufficient stock. Current stock is %d, required %d.",
                                product.getStock(), dto.getQuantity())
                );
            }
        } else {
            throw new IllegalArgumentException("Invalid adjustment type: " + dto.getType());
        }

        return adminProductRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    }
}