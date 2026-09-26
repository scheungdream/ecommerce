package com.ecommerce.controller.admin;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin")
public class DashboardController {

    @GetMapping("/")
    public String index() {
        return "redirect:/overview";
    }

    @GetMapping("/overview")
    public String overviewPage() {
        return "admin/overview";
    }

    @GetMapping("/login")
    public String login() {
        return "admin/login";
    }

    @GetMapping("/orders")
    public String ordersPage() {
        return "admin/orders";
    }

    @GetMapping("/products")
    public String productsPage() {
        return "admin/products";
    }

    @GetMapping("/users")
    public String usersPage() {
        return "admin/users";
    }

    @GetMapping("/files")
    public String filesPage() {
        return "admin/files";
    }
}