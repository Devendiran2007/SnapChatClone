using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using SnapChatClone.Models;
using SnapChatClone.Data;
using SnapChatClone.DTOs;

[ApiController]
[Route("api/[controller]")]

public class AuthController : ControllerBase
{

    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    
    public AuthController(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    private string GenerateToken(User user)
    {
        var claims = new[]
        {
        new Claim(ClaimTypes.NameIdentifier,
            user.Id.ToString()),

        new Claim(ClaimTypes.Name,
            user.Username)
    };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key is not configured.")));

        var credentials =
            new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var token =
            new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: credentials
            );

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }

    [HttpPost("register")]
    public IActionResult Register(RegisterDto dto)
    {
        var existingUser = _context.Users.FirstOrDefault(u => u.Username == dto.Username);

        if (existingUser != null)
        {
            return BadRequest("Username already exists");
        }

        var existingEmail = _context.Users.FirstOrDefault(u => u.Email == dto.Email);

        if (existingEmail != null)
        {
            return BadRequest("Email already exists");
        }
        var newUser = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };

        _context.Users.Add(newUser);
        
        _context.SaveChanges();

        return Ok(new
        {
            Message = "User Registered",
            Username = dto.Username,
            Email = dto.Email
        });
    }

    [HttpPost("login")]
    public IActionResult Login(LoginDto dto)
    {
        var user = _context.Users.FirstOrDefault(s => s.Username == dto.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized("Invalid Username or Password");
        }

        var token = GenerateToken(user);

        return Ok(new
        {
            Token = token
        });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var username = User.FindFirst(ClaimTypes.Name)?.Value;

        return Ok(new
        {
            UserId = userId,
            Username = username
        });
    }

    [HttpGet("users")]
    public IActionResult GetUsers()
    {
        var users = _context.Users.ToList();
        return Ok(users);
    }
}
