"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalPurchases: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch customers from localStorage when component mounts
  useEffect(() => {
    const storedCustomers = localStorage.getItem("customers");
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    }
  }, []);

  // Handle adding a new customer and storing it in both state and localStorage
  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone) {
      alert("Please fill in all fields.");
      return;
    }

    const newCustomerData: Customer = {
      id: Date.now().toString(),
      totalPurchases: 0, // Initialize with 0 purchases
      ...newCustomer,
    };

    // Update state and store the updated customers in localStorage
    const updatedCustomers = [...customers, newCustomerData];
    setCustomers(updatedCustomers);
    localStorage.setItem("customers", JSON.stringify(updatedCustomers));

    // Reset the form
    setNewCustomer({ name: "", email: "", phone: "" });
    setIsDialogOpen(false);
  };

  // Handle making a purchase for a customer
  const handleMakePurchase = (customerId: string) => {
    const updatedCustomers = customers.map((customer) => {
      if (customer.id === customerId) {
        const updatedCustomer = { ...customer, totalPurchases: customer.totalPurchases + 1 };
        return updatedCustomer;
      }
      return customer;
    });

    setCustomers(updatedCustomers);
    localStorage.setItem("customers", JSON.stringify(updatedCustomers));

    // Update the segment customer count after the purchase
    updateSegmentCustomerCount();
  };

  // Function to update the customer count in segments based on the rule
  const updateSegmentCustomerCount = () => {
    const segments = JSON.parse(localStorage.getItem("segments") || "[]");
    segments.forEach((segment: any) => {
      const customersInSegment = customers.filter(
        (customer) => customer.totalPurchases > 1 // Apply the rule here
      );
      segment.customerCount = customersInSegment.length;
    });
    localStorage.setItem("segments", JSON.stringify(segments));
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new customer.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
              />
              <Input
                placeholder="Email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
              />
              <Input
                placeholder="Phone"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAddCustomer}>Add Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {customers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No customers found. Add your first customer!</p>
          </div>
        ) : (
          customers.map((customer) => (
            <div
              key={customer.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold">{customer.name}</h3>
              <p className="text-gray-600">Email: {customer.email}</p>
              <p className="text-gray-600">Phone: {customer.phone}</p>
              <p className="text-gray-600">Total Purchases: {customer.totalPurchases}</p>

              <Button
                className="mt-2"
                onClick={() => handleMakePurchase(customer.id)}
              >
                Make Purchase
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
