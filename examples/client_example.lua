-- Enabling debug
exports["fivem-rpc"]:debug(true)

-- Register locally
exports["fivem-rpc"]:register("isPlayerSwimming", function()
    return IsPedSwimming(PlayerPedId())
end)
