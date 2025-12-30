"use client"
import React, { useState, useEffect } from "react";
import { ToastContainer, toast, Bounce } from 'react-toastify';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming Checkbox installed or I'll use standard for now if not. Ah, I forgot to install Checkbox. Using simple input type=checkbox for SSL.

export default function Home() {

  const notify = () => { toast.success('DB Connected!', { theme: "dark", transition: Bounce }); }
  const usesql = () => { toast.success('Coming Soon! Connect to MySQL!', { theme: "dark", transition: Bounce }); }
  const connect = () => { toast.info('Understanding Schema...', { theme: "dark", transition: Bounce, autoClose: 3000 }); }

  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/session');
      const data = await res.json();
      if (data.connected) {
        notify()
        window.location.href = "/chat";
      }
    }
    checkSession();
  }, []);


  const [conn_type, setconn_type] = useState("MySQL")
  const [url, seturl] = useState("")

  const [formData, setformData] = useState({
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "my_db",
    "ssl": false
  })

  const handleSubmit = async (e) => {
    e.preventDefault();
    connect();
    try {
      const response = await fetch('/api/db', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await handleSchema();
        window.location.href = "/chat";
      }
    } catch (error) {
      console.log(error)
      toast.error('Connection Failed', { theme: "dark" });
    }
  }

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/db', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: url,
      });

      if (response.ok) {
        window.location.href = "/chat";
      }
    } catch (error) {
      console.log(error)
      toast.error('Connection Failed', { theme: "dark" });
    }
  }

  const handleSchema = async () => {
    try {
      const response = await fetch('/api/schema', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: "mysql",
      });
      if (response.ok) {
        console.log("DB Schema Synced")
      }
    } catch (error) {
      console.log(error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setformData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "port" ? parseInt(value, 10) || 0 : value,
    }));
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white p-4">
      <Card className="w-full max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">QueryCraft AI</CardTitle>
          <CardDescription className="text-center text-zinc-400">
            Connect your database to start crafting queries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              {["MySQL", "PostgresSQL", "MongoDB"].map((db) => (
                <button
                  key={db}
                  onClick={() => setconn_type(db)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${conn_type === db
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  {db}
                </button>
              ))}
            </div>
          </div>

          {conn_type === "MySQL" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="host">Host</Label>
                  <Input id="host" name="host" value={formData.host} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="port">Port</Label>
                  <Input type="number" id="port" name="port" value={formData.port} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="database">Database</Label>
                  <Input id="database" name="database" value={formData.database} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="user">User</Label>
                  <Input id="user" name="user" value={formData.user} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="password">Password</Label>
                  <Input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="ssl"
                  name="ssl"
                  checked={formData.ssl}
                  onChange={handleChange}
                  className="rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-blue-600/20"
                />
                <Label htmlFor="ssl" className="font-normal cursor-pointer">Use SSL (requires env CA)</Label>
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">Connect MySQL</Button>
            </form>
          )}

          {conn_type === "MongoDB" && (
            <form onSubmit={handleURLSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Connection URL</Label>
                <Input id="url" name="url" value={url} onChange={(e) => seturl(e.target.value)} placeholder="mongodb://..." className="bg-zinc-950 border-zinc-800" />
              </div>
              <Button type="submit" disabled className="w-full bg-zinc-800 text-zinc-500 cursor-not-allowed mt-4">Coming Soon</Button>
            </form>
          )}

          {conn_type === "PostgresSQL" && (
            <div className="text-center py-10 text-zinc-400">
              PostgresSQL support is coming soon!
            </div>
          )}

        </CardContent>
        <CardFooter className="justify-center text-xs text-zinc-500">
          Secure • Local • Fast
        </CardFooter>
      </Card>

      <ToastContainer position="top-center" autoClose={5000} theme="dark" transition={Bounce} />
    </div>
  );
}