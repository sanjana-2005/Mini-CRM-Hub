"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Play, Pause, StopCircle } from "lucide-react";
import Script from "next/script";

interface Campaign {
  id: string;
  name: string;
  description: string;
  deliveryStatus: string;
  status: "draft" | "active" | "paused" | "completed";
  metrics?: {
    sent: number;
    opened: number;
    clicked: number;
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Campaign["status"]>("draft");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const stored = localStorage.getItem("campaigns");
    if (stored) {
      const parsed = JSON.parse(stored);
      const migrated = parsed.map((c: any) => ({
        ...c,
        metrics: c.metrics ?? { sent: 0, opened: 0, clicked: 0 },
      }));
      setCampaigns(migrated);
      localStorage.setItem("campaigns", JSON.stringify(migrated));
    }
  }, []);

  const simulateDeliveryStatus = () => Math.random() < 0.9 ? "SENT" : "NOT RECEIVED";

  // Simulate random metrics for Sent, Opened, and Clicked
  const simulateMetrics = () => ({
    sent: Math.floor(Math.random() * 100),
    opened: Math.floor(Math.random() * 50),
    clicked: Math.floor(Math.random() * 20),
  });

  const handleCreateCampaign = () => {
    if (!name || !description) {
      alert("Please fill in all fields.");
      return;
    }

    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name,
      description,
      deliveryStatus: simulateDeliveryStatus(),
      status,
      metrics: simulateMetrics(), // Simulate metrics for sent, opened, clicked
    };

    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    localStorage.setItem("campaigns", JSON.stringify(updated));
    setName("");
    setDescription("");
    setStatus("draft");
  };

  const handleStatusChange = (id: string, newStatus: Campaign["status"]) => {
    const updated = campaigns.map((c) =>
      c.id === id ? { ...c, status: newStatus } : c
    );
    setCampaigns(updated);
    localStorage.setItem("campaigns", JSON.stringify(updated));
  };

  const filtered =
    filterStatus === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filterStatus);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Campaigns</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new marketing campaign.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Label>Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Campaign["status"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCampaign}>Create Campaign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Label>Filter by Status</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No campaigns found.</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-semibold">{c.name}</h3>
              <p className="text-gray-600 mt-2">{c.description}</p>
              <p className="text-gray-600 mt-2">
                Delivery Status:{" "}
                <span className={c.deliveryStatus === "SENT" ? "text-green-500" : "text-red-500"}>
                  {c.deliveryStatus}
                </span>
              </p>
              <p className="text-gray-600 mt-2">
                Status:{" "}
                <span
                  className={
                    c.status === "active"
                      ? "text-green-500"
                      : c.status === "paused"
                      ? "text-yellow-500"
                      : c.status === "completed"
                      ? "text-blue-500"
                      : "text-gray-500"
                  }
                >
                  {c.status}
                </span>
              </p>
              <div className="mt-2 space-x-2">
                {c.status === "draft" && (
                  <Button size="sm" onClick={() => handleStatusChange(c.id, "active")}>
                    <Play className="h-4 w-4 mr-1" /> Activate
                  </Button>
                )}
                {c.status === "active" && (
                  <>
                    <Button size="sm" onClick={() => handleStatusChange(c.id, "paused")}>
                      <Pause className="h-4 w-4 mr-1" /> Pause
                    </Button>
                    <Button size="sm" onClick={() => handleStatusChange(c.id, "completed")}>
                      <StopCircle className="h-4 w-4 mr-1" /> Complete
                    </Button>
                  </>
                )}
                {c.status === "paused" && (
                  <Button size="sm" onClick={() => handleStatusChange(c.id, "active")}>
                    <Play className="h-4 w-4 mr-1" /> Resume
                  </Button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <strong>{c.metrics?.sent ?? 0}</strong>
                  <div className="text-muted-foreground">Sent</div>
                </div>
                <div>
                  <strong>{c.metrics?.opened ?? 0}</strong>
                  <div className="text-muted-foreground">Opened</div>
                </div>
                <div>
                  <strong>{c.metrics?.clicked ?? 0}</strong>
                  <div className="text-muted-foreground">Clicked</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chatbot UI */}
      <div
        dangerouslySetInnerHTML={{
          __html: `
            <div class='chatbot-header' style='position:relative; z-index:9999; margin-bottom:1rem;'>
              <button class='chatbot-btn' onclick='toggleChatbot()' style='background:#007bff;color:#fff;border:none;padding:10px 16px;border-radius:6px;font-weight:600;cursor:pointer'>
                💬 Chat with us
              </button>
            </div>
            <div class='chatbot-container' id='chatbot' style='display:none;position:fixed;top:80px;right:20px;width:300px;height:400px;border:1px solid #ccc;background:#fff;z-index:9999;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,0.2)'>
              <div style='background:#007bff;color:#fff;padding:10px;border-top-left-radius:8px;border-top-right-radius:8px;display:flex;justify-content:space-between;align-items:center;'>
                <span>AI Chatbot</span>
                <button onclick='toggleChatbot()' style='background:none;border:none;color:#fff;font-weight:bold;'>✖</button>
              </div>
              <div id='messages' style='padding:10px;overflow-y:auto;height:300px;background:white;color:#111;'></div>
              <div style='display:flex;border-top:1px solid #ccc;'>
                <input type='text' id='userInput' placeholder='Type a message...' style='flex:1;padding:8px;border:none;' />
                <button onclick='sendMessage()' style='background:#007bff;color:#fff;border:none;padding:8px;'>Send</button>
              </div>
            </div>
          `,
        }}
      />

      <Script
        id="chatbot-js"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            function toggleChatbot() {
              const el = document.getElementById('chatbot');
              el.style.display = el.style.display === 'none' ? 'block' : 'none';
            }

            document.addEventListener('DOMContentLoaded', function () {
              const input = document.getElementById('userInput');
              if (input) {
                input.addEventListener('keypress', function (e) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                  }
                });
              }
            });

            async function sendMessage() {
              const input = document.getElementById('userInput');
              const messages = document.getElementById('messages');
              const userText = input.value.trim();
              if (!userText) return;

              messages.innerHTML += "<div style='color:#111;font-weight:500;margin-bottom:6px'><strong>You:</strong> " + userText + "</div>";
              input.value = "";

              try {
                const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyD2_9YRlBiM_K50zgWBlYfq4rPNZjCLCnw", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: userText }] }]
                  })
                });

                const data = await res.json();
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
                messages.innerHTML += "<div style='color:#111;font-weight:500;margin-bottom:6px'><strong>Bot:</strong> " + reply + "</div>";
                messages.scrollTop = messages.scrollHeight;
              } catch (err) {
                messages.innerHTML += "<div style='color:#111;font-weight:500;margin-bottom:6px'><strong>Bot:</strong> Error occurred.</div>";
                messages.scrollTop = messages.scrollHeight;
              }
            }
          `,
        }}
      />
    </div>
  );
}
