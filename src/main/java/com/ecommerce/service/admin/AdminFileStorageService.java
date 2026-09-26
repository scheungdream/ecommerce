package com.ecommerce.service.admin;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminFileStorageService {

    private final Path uploadPath = Paths.get("src/main/resources/public/images/uploads").toAbsolutePath().normalize();

    public AdminFileStorageService() {
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory!", e);
        }
    }

    public String storeFile(MultipartFile file) {
        try {
            String originalFilename = file.getOriginalFilename();

            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String uniqueFilename = UUID.randomUUID() + extension;

            Path targetLocation = this.uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return "/images/uploads/" + uniqueFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }

    public List<Map<String, Object>> listAllFiles() {
        File folder = uploadPath.toFile();
        File[] files = folder.listFiles();
        if (files == null) return Collections.emptyList();

        return Arrays.stream(files)
                .filter(File::isFile)
                .map(file -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("name", file.getName());
                    map.put("url", "/images/uploads/" + file.getName());
                    map.put("size", file.length());
                    map.put("lastModified", file.lastModified());
                    return map;
                })
                .sorted((a, b) -> Long.compare((long) b.get("lastModified"), (long) a.get("lastModified")))
                .collect(Collectors.toList());
    }

    public boolean deleteFile(String fileName) {
        try {
            Path file = uploadPath.resolve(fileName).normalize();
            return Files.deleteIfExists(file);
        } catch (IOException e) {
            return false;
        }
    }
}