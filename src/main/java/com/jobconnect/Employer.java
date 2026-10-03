package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="employers") @Data
public class Employer {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long employerId;
  @OneToOne(optional=false) @JoinColumn(name="user_id") private User user;
  private String companyName, location, website;
  @Column(length=2000) private String description;
}
