package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface NotificationRepo extends JpaRepository<Notification,Long> {
  List<Notification> findByUserOrderByCreatedAtDesc(User u);
  List<Notification> findByUserAndReadFalseOrderByCreatedAtDesc(User u);
  long countByUserAndReadFalse(User u);
}
