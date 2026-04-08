using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using IdCardPrintingSaaS.Data;
using IdCardPrintingSaaS.Models;

namespace IdCardPrintingSaaS.Services
{
    public interface IOrderService
    {
        Task<IEnumerable<Order>> GetOrdersByRoleAsync(string userId, string role);
        Task<Order> CreateOrderAsync(CreateOrderDto dto);
    }

    public class OrderService : IOrderService
    {
        private readonly ApplicationDbContext _context;

        public OrderService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Order>> GetOrdersByRoleAsync(string userId, string role)
        {
            var query = _context.Orders.Include(o => o.Items).AsQueryable();

            if (role == "Printing")
            {
                query = query.Where(o => o.AssignedToPrintingUserId == userId);
            }
            else if (role == "Factory")
            {
                query = query.Where(o => o.AssignedToFactoryUserId == userId);
            }
            else if (role == "Client")
            {
                query = query.Where(o => o.Client.UserId == userId);
            }

            return await query.ToListAsync();
        }

        public async Task<Order> CreateOrderAsync(CreateOrderDto dto)
        {
            var order = new Order
            {
                ClientId = dto.ClientId,
                OrderDate = System.DateTime.UtcNow,
                DeliveryDate = dto.DeliveryDate,
                TotalAmount = dto.TotalAmount,
                Status = "Pending",
                Items = dto.Items.Select(i => new OrderItem
                {
                    ItemType = i.ItemType,
                    Category = i.Category,
                    Quantity = i.Quantity
                }).ToList()
            };

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }
    }
}
