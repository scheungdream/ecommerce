package com.ecommerce.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StockAdjustDTO {
    public enum Type {
        INCREASE, DECREASE
    }

    @NotNull(message = "Adjustment type is required")
    private Type type;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be greater than 0")
    private Integer quantity;
}