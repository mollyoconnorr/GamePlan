package edu.carroll.gameplan.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * This controller is used when the frontend is served as a static resource.
 * Any frontend route (/app/**) is forwarded to index.html, since React handles
 * routing on the client side.
 */
@Controller
public class SpaController {

    @GetMapping({"/app", "/app/{path:[^.]*}", "/app/{path:^(?!api$).*$}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
