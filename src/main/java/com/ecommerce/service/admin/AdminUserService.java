package com.ecommerce.service.admin;

import com.ecommerce.enums.UserStatus;
import com.ecommerce.model.User;
import com.ecommerce.repository.admin.AdminUserRepository;
import com.ecommerce.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final AuthService authService;
    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    public Page<User> getAllUsers(String keyword, Pageable pageable) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            return adminUserRepository.searchUsers(keyword.trim(), pageable);
        }
        return adminUserRepository.findAll(pageable);
    }

    public User saveUser(User user) {

        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        if (user.getEmailValidationCode() == null) {
            String uniqueToken = authService.generateSha256Token(user.getEmail());
            user.setEmailValidationCode(uniqueToken);
        }

        if (user.getRole() != null && !user.getRole().startsWith("ROLE_")) {
            user.setRole("ROLE_" + user.getRole());
        }

        if (user.getStatus() == null) {
            user.setStatus(UserStatus.PENDING.name());
        }

        return adminUserRepository.save(user);
    }

    public User updateUser(Long id, User userDetails) {
        User user = adminUserRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        user.setUsername(userDetails.getUsername());
        user.setEmail(userDetails.getEmail());

        if (userDetails.getRole() != null) {
            String role = userDetails.getRole();
            user.setRole(role.startsWith("ROLE_") ? role : "ROLE_" + role);
        }

        if (userDetails.getStatus() != null) {
            user.setStatus(userDetails.getStatus());
        }

        if (userDetails.getPassword() != null && !userDetails.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }

        return adminUserRepository.save(user);
    }

    public void deleteUser(Long id) {
        if (!adminUserRepository.existsById(id)) {
            throw new RuntimeException("User not found with id: " + id);
        }
        adminUserRepository.deleteById(id);
    }
}