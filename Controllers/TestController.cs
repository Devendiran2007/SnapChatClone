using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{

    [HttpGet]
    public IActionResult test() {
        return Ok("Testing Controller");
    }

}
