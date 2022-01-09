// Require the necessary discord.js classes
const { Client, Intents, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');


class Config
{
    // UniVR Bot

    loadConfig(){
        const fs = require('fs');
        let rawdata = fs.readFileSync('configuration.json');
        this.config = JSON.parse(rawdata);
    }

    saveConfig(){
        const fs = require('fs');
        let txt_config = JSON.stringify(this.config);
        fs.writeFileSync('configuration.json',txt_config);
    }    

    getCategories(triennali, magistrali){
        if(triennali === undefined){triennali = true;}
        if(!magistrali === undefined){magistrali = true;}

        this.loadConfig();
        var categories = this.config['categories']
        if ( triennali && magistrali ){ return categories; }
        if (triennali){
            return categories.filter(cat => cat['category']['group_category'] == 'T')
        }
        if (magistrali){
            return categories.filter(cat => cat['category']['group_category'] == 'M')
        }
        return categories;
    }

    getCategoriesRoles(triennali, magistrali){
        var cats = this.getCategories(triennali, magistrali);
        var roles = cats.map( cat => cat["role"] );
        return roles;
    }

    getCategoriesRolesIds(triennali, magistrali){
        var roles = this.getCategoriesRoles(triennali, magistrali);
        var roles_ids = roles.map( role =>  parseInt(role["id_role"]) );
        return roles_ids;
    }
    
}


class Bot{

    //SETUP
    constructor(){
        this.commands = {};
        this.buttons = {};
        this.selects = {};
        
        // Create a new client instance
        this.client = new Client({ intents: [Intents.FLAGS.GUILDS] });
    }

    registerEventSender(sender){
        this.client.once('ready', () => { this.onStart(sender) }); // When the client is ready, run this code (only once)
        this.client.on('ready',  () => { this.onReady(sender) } ); // on: Login, ... 
        this.client.on('interactionCreate', (interaction) => {
            if ( interaction.isCommand() ) {
                this.onCommand(sender, interaction);
            } else if ( interaction.isButton() ) {
                this.onButton(sender, interaction);
            } else if ( interaction.isSelectMenu() ) {
                this.onSelect(sender, interaction);
            }else{
                this.onInteraction(sender, interaction);
            }
        } );
    }

    

    //CONNECT
    connect(token, clientId, guildId){
        this.connectClient(token);
        this.connectRest(token, clientId, guildId)
    }

    connectClient(token){
        if (token){ this.token = token; }
        this.client.login(this.token);
    }

    connectRest(token, clientId, guildId){
        if (token){ this.token = token; }   
        
        var rest = new REST({ version: '9' }).setToken(this.token);
        var commands_list = Object.entries(this.commands);
        var slash_cmds = commands_list.map( command => command[1]["data"] );
        var commands_json = slash_cmds.map( command => command.toJSON() );
        
        rest.put( Routes.applicationGuildCommands(clientId, guildId), { body: commands_json } )
            .then(  () => { console.log('Successfully registered application commands.'); } )
            .catch( console.error );
        return rest;
    }




    // EVENTS
    async onStart(sender){
        console.log('Ready!'+sender);
    }

    async onReady(sender){
        console.log('Logged in...'+sender);
    }



    // INTERACTIONS: COMMANDS
    makeCommand(name, description){
        var command = new SlashCommandBuilder();
        command.defaultPermission = true;
        command.setName(name); 
        if (description !== undefined) { command.setDescription(description);}
        return command;
    }

    registerCommand(command, callback){
        var id = command.name;
        this.commands[id] = {"id":id, "data":command, "callback":callback};
    }

    addCommand(name, description, callback){
        var cmd = this.makeCommand(name, description);
        this.registerCommand(cmd,callback);
        return cmd;
    }

    getCommand(name, raw=false){
        if (raw === true){ return this.commands[name] }
        return this.commands[name]["data"];
    }



    // INTERACTIONS: BUTTONS
    makeButton(customId, description, style){
        var button = new MessageButton();
        button.setCustomId(customId);
        if (description) {button.setLabel(description);}
        if (style) {button.setStyle(style);}
        return button;
    }

    registerButton(button, callback){
        var id = button.customId;
        this.buttons[id] = {"id":id, "data":button, "callback":callback};
    }

    addButton(name, description, style, callback){
        var button = this.makeButton(name, description, style);
        this.registerButton(button,callback);
       
        return button;
    }

    getButton(name, raw=false){
        if (raw === true){ return this.buttons[name] }
        return this.buttons[name]["data"];
    }

    // INTERACTIONS: SELECT
    makeSelect(customId, placeholder, options){
        var select =new MessageSelectMenu()
        select.setCustomId(customId);
        if (placeholder !== undefined) {select.setPlaceholder(placeholder);}
        if (options !== undefined) {select.addOptions(options);}
        return select;
    }

    registerSelect(select, callback){
        var id = select.customId;
        this.selects[id] = {"id":id, "data":select, "callback":callback};
    }

    addSelect(customId, placeholder, options, callback){
        var select = this.makeSelect(customId, placeholder, options);
        this.registerSelect(select,callback);
        return select;
    }
    getSelect(name, raw=false){
        if (raw === true){ return this.selects[name] }
        return this.selects[name]["data"];
    }

   
    

    //INTERACTIONS: EVENT
    async onCommand(sender, interaction) {
        const { commandName } = interaction;
        console.log('commandName: ' + commandName);
        var command = this.commands[commandName];
        if ( command ){
            var callback = command['callback'];
            await callback(sender, interaction);
        }else{
            await interaction.reply('Unknown command: ' + commandName);
        }
    }

    async onButton(sender, interaction) {
        const { customId } = interaction;
        console.log('customId: ' + customId);

        var button = this.buttons[customId];
        if ( button ){
            var callback = button['callback'];
            await callback(sender, interaction);
        }else{
            await interaction.reply('Unknown button: ' + customId);
        }
    }

    async onSelect(sender, interaction) {
        const { customId } = interaction;
        console.log('customId: ' + customId);

        var select = this.selects[customId];
        if ( select ){
            var callback = select['callback'];
            await callback(sender, interaction);
        }else{
            await interaction.reply('Unknown select: ' + customId);
        }
    }

    async onInteraction(sender, interaction) {
        console.log(interaction);
    }

    // SEND
    async channelSend(channel_id, message){
        const channel = await this.client.channels.fetch(channel_id);
        channel.send(message);
    }

    async userSend(user_id, message){
        const user = await this.client.users.fetch(user_id);
        user.send(message);
    }

    
}









class BotUniVR extends Bot
{
    //SETUP
    constructor(){
        super();

        this.config = new Config();
        this.init();
    }
    //Init
    init(){
        this.registerEventSender(this);
        
        //COMMANDS
        this.addCommand('corsi', 'Menu scielta corsis', this.showSceltaCorsi);
        this.addCommand('ping', 'Replies with pong!', this.pong);
        this.addCommand('server', 'Replies with server info!', this.serverStatus);
        this.addCommand('user', 'Replies with user info!', this.userInfo); 

        //BUTTONS
        this.addButton('btn_triennali','Corsi Triennali', 'SUCCESS', this.showTriennali);
        this.addButton('btn_magistrali','Corsi Magistrali', 'SUCCESS', this.showMagistrali);
        this.addButton('btn_extra','Altre attività', 'PRIMARY', this.showExtra);

        //SELECTS
        let roles_t = this.config.getCategoriesRoles(true, false);
        this.addSelectRoles("select_triennali", "Corsi Triennali", roles_t, this.selectTriennali );
        
        let roles_m = this.config.getCategoriesRoles(false, true);
        this.addSelectRoles("select_magistrali", "Corsi Magistrali", roles_m, this.selectMagistrali  );
    
    }

    
    makeSelectRoles(customId, placeholder, roles){
        let options = roles.map( (role) => { 
                let option = {
                    "label": ""+role["name_role"],
                    "value": ""+role["id_role"],
                    "emoji": ""+role["emoji_role"]
                };
                if (role["default"] === true ){option["default"]="true"}
                return option;
            });
        options.push({"label":"None", "value":"-1"});
        let select_t = this.makeSelect(customId, placeholder, options);
        select_t.setMaxValues(options.length);
        return select_t;
    }

    addSelectRoles(customId, placeholder, roles, callback){
        let select = this.makeSelectRoles(customId, placeholder, roles);
        this.registerSelect(select, callback);
    }
  


    //COMMANDS
    async pong(sender, interaction){ await interaction.reply('pong'); }
    async serverStatus(sender, interaction){ await interaction.reply('server status'); }
    async userInfo(sender, interaction){ await interaction.reply('user info'); }
    
    //UI: MENU CORSI: show 3 buttons
    async showSceltaCorsi(sender, interaction){
        const select_t = sender.getSelect("select_triennali");
        const select_m = sender.getSelect("select_magistrali");
        const row_t = new MessageActionRow().addComponents(select_t);
        const row_m = new MessageActionRow().addComponents(select_m);

        /*
        const btn_t = sender.getButton('btn_triennali');
        const btn_m = sender.getButton('btn_magistrali');
        const btn_e = sender.getButton('btn_extra');
        
        const row = new MessageActionRow().addComponents(btn_t, btn_m, btn_e);
        */
        await interaction.reply({ content: 'Seleziona la categoria', components: [row_t,row_m], ephemeral: true });
    }

    //UI: MENU CORSI: SELECT triennali
    async showTriennali(sender, interaction){
        var select_t = sender.getSelect("select_triennali");
        const row = new MessageActionRow().addComponents(select_t);
        await interaction.reply({ content: 'Menu corsi triennali', components: [row], ephemeral: true });
    }

    //UI: MENU CORSI: SELECT magistrali
    async showMagistrali(sender, interaction){
        var select_m = sender.getSelect("select_magistrali");
        const row = new MessageActionRow().addComponents(select_m);
        await interaction.reply({ content: 'Menu corsi triennali', components: [row], ephemeral: true });
    }

    //UI: MENU CORSI: SELECTed some triennali
    async selectTriennali(sender, interaction){
        await interaction.deferReply({ ephemeral: true }); //Thinking ... 

        var select_roles = sender.config.getCategoriesRolesIds(true,false);
        var new_roles = interaction.values.map( value => parseInt(value) );
        
        await sender.updateRoles(interaction.guild, interaction.member, select_roles, new_roles );
        await interaction.editReply({ content: 'Roles assigned!', ephemeral: true });
    }

    //UI: MENU CORSI: SELECTed some magistrali
    async selectMagistrali(sender, interaction){
        await interaction.deferReply({ ephemeral: true }); //Thinking ... 
        let select_roles = sender.config.getCategoriesRolesIds(false, true);
        let new_roles = interaction.values.map( value => parseInt(value) );
        
        await sender.updateRoles(interaction.guild, interaction.member, select_roles, new_roles );
        
        await interaction.editReply({ content: 'Roles assigned!', ephemeral: true });
    }


    // Utility: update roles "differentially" 
    async updateRoles(guild, member, select_roles, new_roles ){
        // get roles
        let contains = (collection,element) => (collection.indexOf(element) != -1);
        
        let user_roles = member._roles.map( role_id => parseInt(role_id) );
        
        // validate roles
        let new_roles_on = new_roles.filter( role_id =>  contains(select_roles,role_id) ); // new_roles on must exist within that "select"
        let new_roles_off = select_roles.filter( role_id => !contains(new_roles_on,role_id) ); // new_roles_off, but not be new_roles on
        
        // compute roles "not yet OFF"
        let role_ids_off = new_roles_off.filter( role_id => contains(user_roles,role_id)  ); 
        // compute roles "not yet ON"
        let role_ids_on = new_roles_on.filter( role_id => !contains(user_roles,role_id) );
        
        let guild_roles = Array.from( guild.roles._cache.values() );
        
        // perform OFF
        let roles_off =  guild_roles.filter( role => contains( role_ids_off, parseInt(role.id) ));
        for(const i in roles_off){ 
            const role = roles_off[i];
            await member.roles.remove(role); 
        }
        
        // perform ON
        let roles_on = guild_roles.filter( role => contains(role_ids_on, parseInt(role.id) ) );
        for(const i in roles_on){
            const role = roles_on[i];
            await member.roles.add(role); 
        }
    }

    
}


module.exports = { BotUniVR, Bot }