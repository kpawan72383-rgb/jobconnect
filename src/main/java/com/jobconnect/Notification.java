package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="notifications") @Data
public class Notification {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long notificationId;
  @ManyToOne(optional=false) @JoinColumn(name="user_id") private User user;
  @Column(length=500) private String message;
  private String type;          // APPLICATION_SUBMITTED, STATUS_CHANGED, DEADLINE_APPROACHING, NEW_APPLICATION
  private Long referenceId;     // jobId or applicationId depending on type
  @Column(name="is_read") private boolean read = false;
  private LocalDateTime createdAt = LocalDateTime.now();
}
