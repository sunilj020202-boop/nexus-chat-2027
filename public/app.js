const socket = io();
const $ = id => document.getElementById(id);
let username = "", roomId = "";

function randomRoom(){
  $("roomId").value = Math.random().toString(36).slice(2,8).toUpperCase();
}
$("randomBtn").onclick = randomRoom;

function join(){
  username = $("username").value.trim() || "Guest";
  roomId = $("roomId").value.trim().toUpperCase() || Math.random().toString(36).slice(2,8).toUpperCase();
  socket.emit("join-room",{username,roomId});
  $("roomLabel").textContent = roomId;
  $("joinScreen").classList.add("hidden");
  history.replaceState({}, "", "?room=" + encodeURIComponent(roomId));
}
$("joinBtn").onclick = join;
$("username").addEventListener("keydown",e=>{if(e.key==="Enter")join()});
$("roomId").addEventListener("keydown",e=>{if(e.key==="Enter")join()});

const params = new URLSearchParams(location.search);
if(params.get("room")) $("roomId").value = params.get("room").toUpperCase();

$("copyBtn").onclick = async()=>{
  const url = location.origin + "?room=" + encodeURIComponent(roomId);
  await navigator.clipboard.writeText(url);
  $("copyBtn").textContent = "COPIED ✓";
  setTimeout(()=>$("copyBtn").textContent="COPY INVITE",1400);
};

$("chatForm").onsubmit = e=>{
  e.preventDefault();
  const input = $("messageInput");
  const text = input.value.trim();
  if(!text) return;
  socket.emit("message",text);
  input.value="";
  socket.emit("typing",false);
};

let typingTimer;
$("messageInput").addEventListener("input",()=>{
  socket.emit("typing",true);
  clearTimeout(typingTimer);
  typingTimer=setTimeout(()=>socket.emit("typing",false),900);
});

socket.on("message",m=>{
  const el=document.createElement("div");
  el.className="msg";
  el.innerHTML=`<div class="meta"><span class="name"></span> · ${m.time}</div><div class="bubble"></div>`;
  el.querySelector(".name").textContent=m.username;
  el.querySelector(".bubble").textContent=m.text;
  $("messages").appendChild(el);
  $("messages").scrollTop=$("messages").scrollHeight;
});

socket.on("system",text=>{
  const el=document.createElement("div");
  el.className="system";
  el.textContent=text;
  $("messages").appendChild(el);
  $("messages").scrollTop=$("messages").scrollHeight;
});

socket.on("room-users",users=>{
  $("onlineCount").textContent=users.length;
  $("avatars").innerHTML="";
  users.slice(0,7).forEach(u=>{
    const a=document.createElement("div");
    a.className="avatar";
    a.title=u;
    a.textContent=(u[0]||"?").toUpperCase();
    $("avatars").appendChild(a);
  });
});

socket.on("typing",data=>{
  $("typing").textContent = data.isTyping ? `${data.username} is typing...` : "";
});
