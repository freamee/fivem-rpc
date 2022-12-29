-- Local event, can only be triggered within this resource.
exports["fivem-rpc"]:on("onJobStarted", function(a)
    print(a)
end)

-- Global event, can be triggered from any resource.
exports["fivem-rpc"]:onGlobal("onPlayerLogin", function(playerSource)
    print(playerSource)
end)


-- Triggering the local event
exports["fivem-rpc"]:trigger("onJobStarted", "miner")

-- Triggering the global event
exports["fivem-rpc"]:triggerGlobal("onPlayerLogin", 2)


-- Calling a client listener
RegisterCommand("isSw", function(source)
    local res = exports["fivem-rpc"]:callClient(source, "isPlayerSwimming")
    print(res)
end)
