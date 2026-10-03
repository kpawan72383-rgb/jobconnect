package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface EmployerRepo extends JpaRepository<Employer,Long> { Optional<Employer> findByUser(User u); }
