fx_version 'adamant'

game 'gta5'

version "1.0"

server_scripts {
    'source/build/rpc_server.js',

    -- TESTS
    'examples/server_example.lua'
}

client_scripts {
    'source/build/rpc_client.js',

    -- TESTS / EXAMPLES
    'examples/client_example.lua'
}
