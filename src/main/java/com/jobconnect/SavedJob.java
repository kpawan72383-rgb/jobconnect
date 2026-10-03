package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="saved_jobs", uniqueConstraints=@UniqueConstraint(columnNames={"job_id","seeker_id"})) @Data
public class SavedJob {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long savedJobId;
  @ManyToOne(optional=false) @JoinColumn(name="job_id") private Job job;
  @ManyToOne(optional=false) @JoinColumn(name="seeker_id") private JobSeeker seeker;
  private LocalDateTime savedAt = LocalDateTime.now();
}
