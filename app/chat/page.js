"use client"
import React, { useState } from 'react'
import JsonToTable from '../components/JsonToTable'

const page = () => {
    
const [input, setinput] = useState("")
const [messages, setmessages] = useState([])
const [query, setquery] = useState("")
const [text, settext] = useState("")
const [output, setoutput] = useState()
const [table, settable] = useState(false)
const [loading, setloading] = useState(false)
const [discuss, setdiscuss] = useState(false)
const [showtables, setshowtables] = useState(false)


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
            body: JSON.stringify({'query':userQuery})
        })

        if(response.ok){
            const data = await response.json();
            setloading(false)
            console.log(data)
            settable(data.table)
            settext(data.text)

            setoutput(JSON.stringify(data))
            
           // setmessages(prev => [...prev, {'sender': 'bot', 'text':data}])
        }

    } catch (error) {
        
    }
}

  return (
    <div className='flex flex-col items-center justify-start h-[100vh]'>
      <nav className='bg-zinc-800 h-14 border-b text-2xl w-full flex items-center justify-start text-zinc-200 border-b-zinc-700'>
        <span className='ml-5'>QueryCraft AI</span>
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

            <div className='w-[100%]  text-zinc-300 p-1'>
              {loading && <div className='loader'></div>}
              {output  && <p>{text}</p>}
          { output && table && <JsonToTable data={output}/> }
            </div>
        </div>


      <div className='bg-zinc-800 h-20 rounded-2xl border absolute flex bottom-2.5 border-zinc-700 px-5 py-2 pt-1 pb-2 w-[80vw]'>
              <div className='flex flex-col w-[100%]'>
                  <input  onKeyDown={e => e.key==='Enter' && handleInput() } onChange={(e)=>{setinput(e.target.value)}} type='text' value={input} className='w-[90%] mt-1 ml-2 font-normal text-zinc-200 focus:outline-none outline-none ' placeholder="Craft Your Queries..." />
                  <div className='w-[90%] mt-3 hidden flex text-sm text-zinc-500 font-normal gap-1.5'><span className='cursor-pointer border border-zinc-500 p-1 rounded-2xl'>Show Tables</span><span className='cursor-pointer border border-zinc-500 p-1 rounded-2xl'>Discuss Mode</span>
                  </div>
             </div>
                    <img onClick={handleInput} className='cursor-pointer h-10 m-auto bg-white rounded-3xl p-1.5' src='/send.png' />      
        </div>
      
      
    </div>


  )
}

export default page
