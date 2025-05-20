"use client"
import React, { useState } from "react";

export default function Home() {

  const [formData, setformData] = useState({
  "host": "localhost",
  "port": 3306,
  "user": "your_username",
  "password": "your_password",
  "database": "your_database"
}
)

  const handleSubmit = async(e) => {
      e.preventDefault();

      try {

        const response = await fetch('/api/db',{
          method:"POST",
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify(formData),

        });
        

        if(response.ok){
          window.location.href = "/chat";
        }
      } catch (error) {
        
        console.log(error)

      }


  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setformData((prev) => ({
      ...prev,
      [name]: name === "port" ? parseInt(value, 10) || 0 : value
    }));
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-zinc-900 text-white">
      <h1 className="mx-auto text-2xl relative top-[-30px]">QueryCraft AI</h1>

      <form className="w-fit flex flex-col" onSubmit={handleSubmit} >

        {["host", "port", "user", "password", "database"].map((field) => (
          <div key={field} className="mb-3">
            <label htmlFor={field} className="block text-sm font-medium mb-1 capitalize">
              {field}:
            </label>
            <input
              type={field === "password" ? "password" : field === "port" ? "number" : "text"}
              id={field}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
        ))}

        <button type="submit" className="bg-blue-500 px-3 py-1.5 rounded-md font mt-5 active:bg-blue-600 cursor-pointer" >Get Started</button>
      </form>
    </div>
  );
}