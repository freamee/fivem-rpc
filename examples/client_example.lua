-- Register locally
exports["fivem-rpc"]:register("isPlayerSwimming", function()
    return IsPedSwimming(PlayerPedId())
end)


-- Register global listener
exports["fivem-rpc"]:registerGlobal("isPlayerClimbing", function()
    return IsPlayerClimbing(PlayerPedId())
end)
