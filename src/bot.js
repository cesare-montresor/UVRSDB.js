// Require the necessary discord.js classes
const { Client, Intents, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

class Bot{

    //SETUP
    constructor(){
        this.commands = {};
        this.buttons = {};
        this.selects = {};
        this.config = new Config();
        
        // Create a new client instance
        this.client = new Client({ intents: [Intents.FLAGS.GUILDS] });
        this.initEvents();
        this.init();
    }

    

    initEvents(){
        var this_bot = this;
        this.client.once('ready', () => { this.onStart(this_bot) }); // When the client is ready, run this code (only once)
        this.client.on('ready',  () => { this.onReady(this_bot) } ); // on: Login, ... 
        this.client.on('interactionCreate', (interaction) => {
            if ( interaction.isCommand() ) {
                this.onCommand(this_bot, interaction);
            } else if ( interaction.isButton() ) {
                this.onButton(this_bot, interaction);
            } else if ( interaction.isSelectMenu() ) {
                this.onSelect(this_bot, interaction);
            }else{
                this.onInteraction(this_bot, interaction);
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
    async onStart(this_bot){
        console.log('Ready!'+this_bot);
    }

    async onReady(this_bot){
        console.log('Logged in...'+this_bot);
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

    

    //INTERACTIONS: EVENT
    async onCommand(this_bot, interaction) {
        const { commandName } = interaction;
        console.log('commandName: ' + commandName);
        var command = this.commands[commandName];
        if ( command ){
            var callback = command['callback'];
            await callback(this_bot, interaction);
        }else{
            await interaction.reply('Unknown command: ' + commandName);
        }
    }

    async onButton(this_bot, interaction) {
        const { customId } = interaction;
        console.log('customId: ' + customId);

        var button = this.buttons[customId];
        if ( button ){
            var callback = button['callback'];
            await callback(this_bot, interaction);
        }else{
            await interaction.reply('Unknown button: ' + customId);
        }
    }

    async onSelect(this_bot, interaction) {
        const { customId } = interaction;
        console.log('customId: ' + customId);

        var select = this.selects[customId];
        if ( select ){
            var callback = select['callback'];
            await callback(this_bot, interaction);
        }else{
            await interaction.reply('Unknown select: ' + customId);
        }
    }

    async onInteraction(this_bot, interaction) {
        console.log(interaction);
    }

    
    
    //Init
    init(){
        this.addCommand('corsi','Menu scielta corsis', this.showSceltaCorsi);
        this.addCommand('ping','Replies with pong!', this.pong);
        this.addCommand('server','Replies with server info!', this.serverStatus);
        this.addCommand('user','Replies with user info!', this.userInfo); 
    }

    //Commands exec
    async pong(this_bot, interaction){ await interaction.reply('pong'); }
    async serverStatus(this_bot, interaction){ await interaction.reply('server status'); }
    async userInfo(this_bot, interaction){ await interaction.reply('user info'); }

    // UI: BUTTON
    async showSceltaCorsi(this_bot, interaction){
        const btn_t = this_bot.addButton('btn_triennali','Scegli corsi Triennali', 'SUCCESS', this_bot.showTriennali);
        const btn_m = this_bot.addButton('btn_magistrali','Scegli corsi Magistrali', 'SUCCESS', this_bot.showMagistrali);
        const btn_e = this_bot.addButton('btn_extra','Scegli altre attività', 'PRIMARY', this_bot.showExtra);

        const row = new MessageActionRow().addComponents(btn_t, btn_m, btn_e);

        await interaction.reply({ content: 'Pong!', components: [row] });
    }

    async showTriennali(this_bot, interaction){
        //TODO: pre-select user pre-existing roles.
        var cats = this_bot.config.getCategories(true,false);
        var options = cats.map( (cat) => { 
                return {
                    "label": ""+cat["role"]["name_role"],
                    "value": ""+cat["role"]["id_role"],
                    "emoji": ""+cat["role"]["emoji_role"]
                }
            });
        options.push({"label":"None", "value":"-1"});
        var select_t = this_bot.addSelect("select_triennali", "Seleziona corsi Triennali", options, this_bot.selectTriennali);
        select_t.setMaxValues(options.length);
        const row = new MessageActionRow().addComponents(select_t);
        await interaction.reply({ content: 'Menu corsi triennali', components: [row], ephemeral: true });
    }

    async selectTriennali(this_bot, interaction){
        var guild_roles = interaction.guild.roles.cache;
        await interaction.deferReply();

        
        var cats = this_bot.config.getCategories(true,false);

        var role_ids_all = cats.map( cat => parseInt(cat["role"]["id_role"]) );        
        var role_ids_user = interaction.member._roles.map( role_id => parseInt(role_id) );

        var role_ids_selected = interaction.values.map( value => parseInt(value) );
        role_ids_selected = role_ids_selected.filter( role_id => role_ids_all.indexOf(role_id) != -1 );

        var role_ids_off = role_ids_all.filter( role_id => role_ids_selected.indexOf(role_id) == -1  );
        role_ids_off = role_ids_off.filter( role_id => role_ids_user.indexOf(role_id) != -1 );

        var role_ids_on = role_ids_selected.filter( role_id => role_ids_user.indexOf(role_id) );
        
        var roles_off =  guild_roles.filter( role => role_ids_off.indexOf(role.id) != -1);
        var roles_on =  guild_roles.filter( role => role_ids_on.indexOf(role.id) != -1);


        await interaction.member.roles.remove(roles_off);
        await interaction.member.roles.add(roles_on);

        await interaction.editReply({ content: 'Work in progress... Roles assigned!', ephemeral: true });

        console.log(interaction);
    }


    async showMagistrali(this_bot, interaction){
        await interaction.reply('buttonMagistrali');
    }

    async showExtra(this_bot, interaction){
        await interaction.reply('buttonExtra');
    }




}


class Config{
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


        
}


module.exports = { Bot }