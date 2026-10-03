package com.jobconnect;

import jakarta.servlet.http.HttpServletRequest;import lombok.RequiredArgsConstructor;import org.springframework.http.HttpStatus;import org.springframework.stereotype.Component;import org.springframework.web.server.ResponseStatusException;import java.util.*;import java.util.concurrent.ConcurrentHashMap;

/** Simple token authentication + role-based access. Token = random UUID kept in memory. */
@Component @RequiredArgsConstructor
public class Auth {
  private final UserRepo users;
  private final HttpServletRequest req;
  private final Map<String,Long> tokens = new ConcurrentHashMap<>();

  public static ResponseStatusException bad(String m){ return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }
  private String token(){ String h = req.getHeader("Authorization"); return h == null ? "" : h.replace("Bearer ", ""); }
  public String issue(User u){ String t = UUID.randomUUID().toString(); tokens.put(t, u.getUserId()); return t; }
  public void revoke(){ tokens.remove(token()); }
  /** Returns the logged-in user; throws 401/403 if missing or the role is not allowed. */
  public User get(Role... roles){
    Long id = tokens.get(token());
    User u = id == null ? null : users.findById(id).orElse(null);
    if (u == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in");
    if (roles.length > 0 && !Arrays.asList(roles).contains(u.getRole()))
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This page is not available for your role");
    return u;
  }
  /** Returns the logged-in user regardless of role; throws 401 if not logged in. */
  public User current(){ return get(); }
}
