"use client"
import React, { useState , useEffect} from "react";
import { ToastContainer, toast, Bounce } from 'react-toastify';


export default function Home() {


  const notify = () => { toast.success('DB Connected!', {
  position: "top-center",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
  transition: Bounce,
  });
  }

   const usesql = () => { toast.success('Coming Soon! Connect to MySQL!', {
  position: "top-center",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
  transition: Bounce,
  });
  }

    const connect = () => {toast.success('Understanding Schema...', {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "dark",
  transition: Bounce,
  });
  }
  useEffect(() => {
  async function checkSession() {
    const res = await fetch('/api/session');
    const data = await res.json();

    if (data.connected) {
      // Already connected, go to chat
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
  "user": "your_username",
  "password": "your_password",
  "database": "your_database",
  "ssl": false
}
)

  const handleSubmit = async(e) => {
      e.preventDefault();
      connect();

      try {

        const response = await fetch('/api/db',{
          method:"POST",
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify(formData),

        });
        

        if(response.ok){
          await handleSchema();
          window.location.href = "/chat";
        }
      } catch (error) {
        
        console.log(error)

      }


  }

   const handleURLSubmit = async(e) => {
      e.preventDefault();

      try {

        const response = await fetch('/api/db',{
          method:"POST",
          headers:{
            'Content-Type':'application/json'
          },
          body:url,

        });
        

        if(response.ok){
          window.location.href = "/chat";
        }
      } catch (error) {
        
        console.log(error)

      }


  }

  const handleSchema = async() => {
      try {

        const response = await fetch('/api/schema',{
          method:"POST",
          headers:{
            'Content-Type':'application/json'
          },
          body:"mysql",

        });
        

        if(response.ok){
         console.log("DB")
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


  const handleUrlChange = (e) => {
      seturl(e.target.value);
  };

  return (
    <div className="flex flex-col md:flex-row  md:justify-evenly items-center min-h-screen bg-zinc-900 text-white">
     
     <div className="w-full md:w-1/2 h-fit md:h-[100vh] bg-zinc-800 rounded-b-2xl pb-3 md:pb-0 md:rounded-tr-4xl flex items-center justify-center">
        <div className="h-fit flex flex-col w-[90%] md:w-[20vw]">
          <h1 className="mx-auto mt-3 md:mt-0">Select Your Database</h1>
          {["PostgresSQL", "MongoDB", "MySQL"].map((dbtype) => (
            <div key={dbtype} className="flex justify-center border border-zinc-700 my-1 rounded-2xl px-2 py-1 gap-1.5">
            <label className="mr-auto w-full" htmlFor="sql">{dbtype}</label>
            <input type="radio" defaultChecked  className=" cursor-pointer" name="dbtype"  value={dbtype} onClick={(e)=>{setconn_type(e.target.value)}}/>
            </div>
          ))}
        </div>
     </div>

      <div className="w-1/2 h-fit md:h-[100vh] md:mb-0 mb-10 flex justify-center items-center">
        {conn_type=="MySQL" && <form className="w-fit flex flex-col h-fit" onSubmit={handleSubmit} >
      <h1 className="mx-auto text-2xl mt-10 md:mt-0 mb-10 md:mb-20">QueryCraft AI</h1>
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

   <div className="mb-5 flex items-center">
        <input
          type="checkbox"
          id="ssl"
          name="ssl"
          checked={formData.ssl}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 bg-zinc-900 border border-zinc-600 rounded focus:ring-blue-500 focus:ring-2"
        />
        <label htmlFor="ssl" className="ml-2 block text-sm font-medium text-white select-none">
          Use SSL (add your CA in .env)
        </label>
      </div>

        <button type="submit" className="bg-blue-500 px-3 py-1.5 rounded-md font mt-5 active:bg-blue-600 cursor-pointer" >Get Started</button>
      </form> }
        {conn_type=="MongoDB" && <form className="w-fit flex flex-col h-fit" onSubmit={handleURLSubmit} >
      <h1 className="mx-auto text-2xl mb-20">QueryCraft AI</h1>
     
            <label htmlFor={"url"} className="block text-sm font-medium mb-1 capitalize">
              {"Connection URL"}:
            </label>
            <input
              type="text"
              id="url"
              name="url"
              value={url}
              onChange={handleUrlChange}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
      


        <button type="submit" disabled className=" bg-blue-500 px-3 py-1.5 rounded-md font mt-5 active:bg-blue-600 cursor-pointer" >Get Started</button>
      </form> }
        {conn_type=="PostgresSQL" && <form className="w-fit flex flex-col h-fit" onSubmit={()=>{usesql}} >
      <h1 className="mx-auto text-2xl mb-20">QueryCraft AI</h1>
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

        <button type="" onClick={()=>{usesql}} className="bg-blue-500 px-3 py-1.5 rounded-md font mt-5 active:bg-blue-600 cursor-pointer" >Get Started</button>
      </form> }
      </div>
     
 <ToastContainer
position="top-center"
autoClose={5000}
hideProgressBar={false}
newestOnTop={false}
closeOnClick={false}
rtl={false}
pauseOnFocusLoss
draggable
pauseOnHover
theme="dark"
transition={Bounce}
/>

    </div>
  );
}