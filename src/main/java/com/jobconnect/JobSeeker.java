package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="job_seekers") @Data
public class JobSeeker {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long seekerId;
  @OneToOne(optional=false) @JoinColumn(name="user_id") private User user;
  private String phone, location, education, skills, experience, resume;
  @Column(length=2000) private String about;
  // V2 fields
  @Column(length=1000) private String careerObjective;
  private String college, degree, graduationYear;
  @Column(length=2000) private String projects;
  @Column(length=1000) private String certifications;
  private String linkedin, github;
}
