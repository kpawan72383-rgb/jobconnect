package com.jobconnect;

import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import java.util.*;

public interface SkillRepo extends JpaRepository<Skill,Long> {
  Optional<Skill> findBySkillName(String name);  // V2
}
