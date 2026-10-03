package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="jobs") @Data
public class Job {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long jobId;
  @ManyToOne(optional=false) @JoinColumn(name="employer_id") private Employer employer;
  private String title, location, salary, experience, jobType, skills;
  private Double salaryMin = 0.0;               // minimum salary in LPA, used for the salary filter
  @Column(length=4000) private String description;
  @Column(length=4000) private String responsibilities;   // V2
  @Column(length=4000) private String qualifications;     // V2
  private LocalDateTime deadline;                          // V2 application deadline
  private String status = "ACTIVE";             // ACTIVE / CLOSED
  private boolean approved = false;             // admin approves postings
  private LocalDateTime createdAt = LocalDateTime.now();
}
