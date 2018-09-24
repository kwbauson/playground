using System.Collections.Generic;

namespace AutoApi
{
    public class Root
    {
        public IEnumerable<Product> Products { get; set; }
        public IEnumerable<Supplier> Suppliers { get; set; }
        public IEnumerable<Category> Categories { get; set; }
    }

    public class Product
    {
        public string ProductName { get; set; }
        public Supplier Supplier { get; set; }
        public Category Category { get; set; }
    }

    public class Supplier
    {
        public string CompanyName { get; set; }
        public IEnumerable<Product> Products { get; set; }
    }

    public class Category
    {
        public string CategoryName { get; set; }
        public string Description { get; set; }
        public IEnumerable<Product> Products { get; set; }
    }
}