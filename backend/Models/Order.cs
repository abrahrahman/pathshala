using System;
using System.Collections.Generic;

namespace IdCardPrintingSaaS.Models
{
    public class Order
    {
        public string Id { get; set; }
        public string ClientId { get; set; }
        public Client Client { get; set; }
        public DateTime OrderDate { get; set; }
        public DateTime DeliveryDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; }
        public string AssignedToPrintingUserId { get; set; }
        public string AssignedToFactoryUserId { get; set; }
        
        public ICollection<OrderItem> Items { get; set; }
        public ICollection<StatusLog> StatusLogs { get; set; }
    }
}
