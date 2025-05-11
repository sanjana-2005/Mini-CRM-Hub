"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Search, Edit as EditIcon, Trash2 as DeleteIcon } from "lucide-react";

interface Segment {
  id: string;
  name: string;
  description: string;
  customerCount: number;
  rules: string[];
  matchedCustomerIds: string[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalPurchases: number;
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const storedSegments = localStorage.getItem("segments");
    const storedCustomers = localStorage.getItem("customers");

    if (storedSegments) {
      setSegments(JSON.parse(storedSegments));
    }
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    }
  }, []);

  const getMatchedCustomers = (rules: string[]) => {
    return customers.filter((customer) => {
      return rules.every((rule) => {
        const [field, operator, value] = rule.split(" ");
        const fieldValue = customer[field as keyof Customer];
        const parsedValue = isNaN(Number(value)) ? value : Number(value);

        switch (operator) {
          case ">":
            return fieldValue > parsedValue;
          case "<":
            return fieldValue < parsedValue;
          case "=":
          case "==":
            return fieldValue == parsedValue;
          case "!=":
            return fieldValue != parsedValue;
          default:
            return false;
        }
      });
    });
  };

  const handleEdit = (segment: Segment) => {
    setEditingId(segment.id);
    setName(segment.name);
    setDescription(segment.description);
    setRules(segment.rules);
    setIsCreating(true);
  };

  const handleDelete = (segmentId: string) => {
    if (!confirm("Are you sure you want to delete this segment?")) return;
    
    const updatedSegments = segments.filter((s) => s.id !== segmentId);
    setSegments(updatedSegments);
    localStorage.setItem("segments", JSON.stringify(updatedSegments));
  };

  const handleCreateSegment = () => {
    if (!name || !description || rules.length === 0) {
      alert("Please fill in all fields and define at least one rule.");
      return;
    }

    const matched = getMatchedCustomers(rules);
    const newSegment: Segment = {
      id: editingId || Date.now().toString(),
      name,
      description,
      customerCount: matched.length,
      rules,
      matchedCustomerIds: matched.map((c) => c.id),
    };

    let updatedSegments;
    if (editingId) {
      updatedSegments = segments.map((s) => (s.id === editingId ? newSegment : s));
    } else {
      updatedSegments = [...segments, newSegment];
    }

    setSegments(updatedSegments);
    localStorage.setItem("segments", JSON.stringify(updatedSegments));

    setName("");
    setDescription("");
    setRules([]);
    setIsCreating(false);
    setEditingId(null);
  };

  const handleAddRule = () => {
    const newRule = prompt("Enter rule (e.g., 'totalPurchases > 1000')");
    if (newRule) {
      setRules((prev) => [...prev, newRule]);
    }
  };

  const handleRemoveRule = (rule: string) => {
    setRules((prev) => prev.filter((r) => r !== rule));
  };

  const filteredSegments = segments.filter((segment) =>
    segment.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Segments</h1>
          <p className="text-muted-foreground">
            Create and manage customer segments
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Segment" : "Create New Segment"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update segment details" : "Define a new customer segment with rules"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rules</Label>
                <div className="space-y-1">
                  <Button variant="outline" onClick={handleAddRule}>
                    Add Rule
                  </Button>
                  <div className="space-y-1 mt-2">
                    {rules.length === 0 ? (
                      <p className="text-gray-500">No rules defined yet.</p>
                    ) : (
                      rules.map((rule, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 bg-gray-100 p-2 rounded"
                        >
                          <span>{rule}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveRule(rule)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              {rules.length > 0 && (
                <div className="bg-gray-100 p-3 rounded">
                  <p className="text-sm">
                    Preview:{" "}
                    <strong>{getMatchedCustomers(rules).length}</strong>{" "}
                    customers match these rules
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsCreating(false);
                setEditingId(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateSegment}>
                {editingId ? "Save Changes" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search segments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSegments.length === 0 ? (
          <div className="col-span-3 text-center py-10">
            <p className="text-gray-500">
              No segments found. Create your first segment!
            </p>
          </div>
        ) : (
          filteredSegments.map((segment) => (
            <Card key={segment.id} className="relative group">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{segment.name}</CardTitle>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(segment)}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(segment.id)}
                    >
                      <DeleteIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{segment.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {segment.matchedCustomerIds?.length ?? 0} customers
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500 font-medium">Rules:</p>
                  <ul className="text-xs text-gray-500 list-disc pl-4 mt-1">
                    {segment.rules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
