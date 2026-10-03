package com.jobconnect;

import lombok.RequiredArgsConstructor;import org.springframework.web.bind.annotation.*;import org.springframework.transaction.annotation.Transactional;import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;import java.util.*;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
  private final UserRepo users; private final SeekerRepo seekers; private final EmployerRepo employers; private final Auth auth;
  private final BCryptPasswordEncoder enc = new BCryptPasswordEncoder();

  private Map<String,Object> session(User u){
    return Map.of("token", auth.issue(u), "role", u.getRole(), "name", u.getName());
  }
  @PostMapping("/register") @Transactional
  public Map<String,Object> register(@RequestBody Map<String,String> b){
    String email = b.getOrDefault("email","").trim().toLowerCase(), pw = b.getOrDefault("password",""), name = b.getOrDefault("name","").trim();
    Role role; try { role = Role.valueOf(b.get("role")); } catch (Exception e) { throw Auth.bad("Choose whether you are a job seeker or an employer"); }
    if (role == Role.ADMIN) throw Auth.bad("Admin accounts cannot be registered");
    if (name.isEmpty() || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") || pw.length() < 6)
      throw Auth.bad("Enter your name, a valid email and a password of at least 6 characters");
    if (users.findByEmail(email).isPresent()) throw Auth.bad("This email is already registered. Log in instead");
    User u = new User(); u.setName(name); u.setEmail(email); u.setPassword(enc.encode(pw)); u.setRole(role); users.save(u);
    if (role == Role.JOB_SEEKER) { JobSeeker s = new JobSeeker(); s.setUser(u); seekers.save(s); }
    else { Employer e = new Employer(); e.setUser(u); e.setCompanyName(b.getOrDefault("companyName", name)); employers.save(e); }
    return session(u);
  }
  @PostMapping("/login")
  public Map<String,Object> login(@RequestBody Map<String,String> b){
    User u = users.findByEmail(b.getOrDefault("email","").trim().toLowerCase()).orElse(null);
    if (u == null || !enc.matches(b.getOrDefault("password",""), u.getPassword())) throw Auth.bad("Email or password is incorrect");
    return session(u);
  }
  @PostMapping("/logout") public void logout(){ auth.revoke(); }
}
