package com.jobconnect;

import jakarta.persistence.*;import lombok.Data;import com.fasterxml.jackson.annotation.*;import java.time.LocalDateTime;

@Entity @Table(name="skills") @Data
public class Skill {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long skillId;
  @Column(unique=true) private String skillName;
}
