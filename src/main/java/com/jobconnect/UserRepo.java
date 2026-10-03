package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface UserRepo extends JpaRepository<User,Long> { Optional<User> findByEmail(String e); long countByRole(Role r); }
