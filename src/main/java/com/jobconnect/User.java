package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="users") @Data
public class User {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long userId;
  private String name;
  @Column(unique=true,nullable=false) private String email;
  @JsonIgnore private String password;
  @Enumerated(EnumType.STRING) private Role role;
  private LocalDateTime createdAt = LocalDateTime.now();
}
