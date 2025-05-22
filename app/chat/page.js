"use client"
import React, { useState } from 'react'
import JsonToTable from '../components/JsonToTable'
import { ToastContainer, toast, Bounce } from 'react-toastify';

import CodeBlock from '../components/CodeBlock'
const page = () => {

const llms = ['Gemini', 'GPT-4', 'Claude', 'Mistral', 'Groq'];
const notify = () => { toast.error('DB Disconnected!', {
position: "top-center",
autoClose: 5000,
hideProgressBar: false,
closeOnClick: false,
pauseOnHover: true,
draggable: true,
progress: undefined,
theme: "dark",
transition: Bounce,
}); }
    
const [input, setinput] = useState("")
const [selectedLLM, setSelectedLLM] = useState('Gemini');
const [open, setOpen] = useState(false);
const [messages, setmessages] = useState([])
const [query, setquery] = useState("")
const [text, settext] = useState("")
const [output, setoutput] = useState()
const [table, settable] = useState(false)
const [sql, setsql] = useState()
const [loading, setloading] = useState(false)
const [showtables, setshowtables] = useState(false)
const [think, setthink] = useState(false)

const handleLogout = async () => {
  notify()
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
};


const handleInput = async() => {

    setoutput("")
    setloading(true)

    if(!input.trim){
        return
    }

    const userQuery = input;
    setquery(input);
    setinput("")

  //  setmessages(prev => [...prev, {'sender': 'user', 'text':userQuery}])

    try {
        const response = await fetch('/api/ask',{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
            },
            body: JSON.stringify({'query':userQuery, 'think':think})
        })

        if(response.ok){
            const data = await response.json();
            setloading(false)
            console.log(data)
            settable(data.table)
            settext(data.text)
            setsql(data.sql)
            setoutput(JSON.stringify(data))
            
           // setmessages(prev => [...prev, {'sender': 'bot', 'text':data}])
        }

    } catch (error) {
        
    }
}

  return (
    <div className='flex flex-col items-center justify-start h-[100vh]'>
      <nav className='bg-zinc-800 h-14 border-b text-2xl w-full flex items-center justify-start text-zinc-200 border-b-zinc-700'>
        <span className='ml-5 flex items-center cursor-pointer' onClick={()=>{window.location.href="/"}} ><img className='h-14 p-2 mr-1' src='/logo.png' /> QueryCraft AI</span>

        <div className="relative ml-auto mr-5  flex items-center gap-1.5 w-fit text-sm text-zinc-300">
          <div
            className="bg-zinc-800 border border-zinc-700 pl-4 pr-2 py-2 rounded-xl cursor-pointer hover:bg-zinc-700 transition"
            onClick={() => setOpen(!open)}>


            <span className='flex items-center justify-center'>{selectedLLM}<svg className='ml-1 w-fit' xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-360 280-560h400L480-360Z" /></svg></span>
          </div>

          {open && (
            <div className="absolute top-10 cursor-pointer z-10 mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg">
              {llms.map((llm) => (
                <div
                  key={llm}
                  onClick={() => {
                    setSelectedLLM(llm);
                    setOpen(false);
                  }}
                  className={`px-4 py-2 hover:bg-zinc-700 rounded-xl transition ${selectedLLM === llm ? 'bg-zinc-700' : ''
                    }`}
                >
                  {llm}
                </div>
              ))}
            </div>
          )}    <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md cursor-pointer text-white "
          >
            Disconnect
          </button>
        </div>



      </nav>


         <div className='w-[80vw] h-[100%] my-auto flex flex-col gap-2.5 overflow-y-scroll overflow-x-scroll mcontainer mb-[90px] pt-3'>
          {query &&  <div className='max-w-[70%] w-fit text-zinc-300 flex items-center justify-start ml-auto mr-2 bg-zinc-700 rounded-2xl rounded-br-[0px] px-3 py-1.5'>
            {query} 
            </div> }

            {!query && <div className='w-[100%] flex flex-col mx-auto my-auto justify-center items-center text-zinc-300 p-1'>
         <h1 className="text-3xl font-semibold">What can I do?</h1>
    <p className="text-center max-w-sm mt-10">
      Ask me anything about your database.
    </p> </div>}

        <div className='w-[fit] overflow-x-scroll mcontainer text-zinc-300 p-1'>
          {loading && <div className='loader'></div>}
          {!think && output && <p>{text}</p>}
          {output && <CodeBlock code={sql} />}
              {output && table && (
        <div className="overflow-x-auto mb-5 w-full scrollbar-dark">
          <JsonToTable className="min-w-max" data={output} />
        </div>
      )}
          {think && output && <p className='mt-2'>{text}</p>}
        </div>
      </div>


      <div className='bg-zinc-800 h-20 rounded-2xl border absolute flex bottom-2.5 border-zinc-700 px-5 py-2 pt-1 pb-2 w-[80vw]'>
              <div className='flex flex-col w-[100%]'>
                  <input  autoFocus onKeyDown={e => e.key==='Enter' && handleInput() } onChange={(e)=>{setinput(e.target.value)}} type='text' value={input} className='w-[90%] mt-1 ml-2 font-normal text-zinc-200 focus:outline-none outline-none ' placeholder="Craft Your Queries..." />
                  <div className='w-[90%] mt-3  flex text-sm text-zinc-500 font-normal gap-1.5'><span onClick={()=>{setthink(!think) 
                    setoutput("") 
                    setinput("")}} className={`cursor-pointer border border-zinc-500 p-1 rounded-2xl ${think ? 'bg-zinc-500 text-zinc-800' : ''}`}>Think Mode</span>
                  </div>
             </div>
                    <img onClick={handleInput} className='cursor-pointer h-10 m-auto bg-white rounded-3xl p-1.5' src='/send.png' />      
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


  )
}

export default page
