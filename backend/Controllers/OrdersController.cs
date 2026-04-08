using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using IdCardPrintingSaaS.Services;
using System.Threading.Tasks;

namespace IdCardPrintingSaaS.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        [HttpGet]
        [Authorize(Roles = "Admin,Printing,Factory,Client")]
        public async Task<IActionResult> GetOrders()
        {
            var userId = User.FindFirst("sub")?.Value;
            var role = User.FindFirst("role")?.Value;
            
            var orders = await _orderService.GetOrdersByRoleAsync(userId, role);
            return Ok(orders);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            var order = await _orderService.CreateOrderAsync(dto);
            return CreatedAtAction(nameof(GetOrders), new { id = order.Id }, order);
        }
    }
}
