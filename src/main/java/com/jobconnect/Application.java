package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="applications", uniqueConstraints=@UniqueConstraint(columnNames={"job_id","seeker_id"})) @Data
public class Application {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long applicationId;
  @ManyToOne(optional=false) @JoinColumn(name="job_id") private Job job;
  @ManyToOne(optional=false) @JoinColumn(name="seeker_id") private JobSeeker seeker;
  private String resume;
  private String status = "APPLIED";
  private LocalDateTime appliedAt = LocalDateTime.now();
}
