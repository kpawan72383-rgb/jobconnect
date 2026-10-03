package com.jobconnect;

import lombok.RequiredArgsConstructor;import org.springframework.boot.CommandLineRunner;import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;import org.springframework.stereotype.Component;import java.util.List;

/** Creates the default admin and the skills list on first run. */
@Component @RequiredArgsConstructor
public class DataInit implements CommandLineRunner {
  private final UserRepo users; private final SkillRepo skills;
  @Override public void run(String... args){
    if (users.findByEmail("admin@jobconnect.com").isEmpty()) {
      User u = new User(); u.setName("Admin"); u.setEmail("admin@jobconnect.com");
      u.setPassword(new BCryptPasswordEncoder().encode("admin123")); u.setRole(Role.ADMIN); users.save(u);
    }
    if (skills.count() == 0)
      for (String n : List.of("Java","C++","Python","SQL","MySQL","Spring Boot","JavaScript","HTML","CSS","React")) { Skill k = new Skill(); k.setSkillName(n); skills.save(k); }
  }
}
