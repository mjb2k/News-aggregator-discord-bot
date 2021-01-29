//Copyright of Matthew Boyer, all rights reserved.
const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const {Builder, By} = require('selenium-webdriver');
const webdriver = require('selenium-webdriver');
const safari = require('selenium-webdriver/safari');
const cron = require("node-cron");
//This bot is a News aggregator and when prompted will spit out
//various articles for a topic specified by the user. 
/*The primary challenges presented by this project was working with the
selenium web driver, which proved particularly difficult. The driver
took some serious work arounds which is why some of the code is rather
inefficient. I cannot explain why the driver sometimes works, and why it
doesn't but I cannot fix those processes and did my best to work around
those issues to make sure the user expects the proper output. The other issue
is concurrency. Right now the bot can only run one function at a time but I
look to fix that issue with threading in the future, should the bot become
used widespread. For now though, the bot runs just fine on limited usage, which
is what I made the bot for anyway. */ 


//startup
client.on('ready',() => {
	console.log('News bot is running...'); });
client.login(auth.token);

//Schedule commands function.
//If the user wishes to schedule news articles to appear based on their
//inquiry (.news or .topic) at certain times of the day then this function will
//perform said wishes.
function schedule_commands(msg, interval, duration, command, args) {
    msg.channel.send("Schedule has been created, will execute " + command + " " +  args +
		 " " + "every" + " " +  interval + " " +  "minutes" + " " + duration + " " + "times");
    //scheduler that will cause the bot to run the command scheduled.
    cron.schedule("*/" + interval + " * * * *", () => {
	    if (duration > 0) {
		//console.log(duration);
		msg.channel.send(command + " " + args);
	    duration--;
	    }
	});
}


//most relevant article command.
//Takes in a topic that is specified by the user, then using
//selenium web driver, googles the topic and selects the most relevant
//articles available, depending on the number requested.. 
async function grab_articles(msg, topic, num_articles) {    
    //directs driver to the google home page.
    let driver 	=  new Builder().forBrowser('safari').build();
    driver.manage().setTimeouts({implicit: 5000});
    await driver.get('https://www.google.com/?client=safari');
    
    //forces driver to "search" the topic.
    try {
    await driver.findElement(By.name("q")).sendKeys(topic);
    await driver.findElement(By.className("gNO89b")).click();
    } catch (ElementNotInteractableError){
    //it sometimes errors when trying to click the search button, so just redo
	driver.quit();
	grab_articles(msg, topic, num_articles);
	return;
    }
    
    //refresh the page to make sure the next piece works.
    await driver.sleep(2000);
    await driver.navigate().refresh();

    //"clicks" on the "News" bar on the google page. 
    try {
        let news = await driver.findElement(By.className("hide-focus-ring")).getAttribute("href");
	await driver.get(news);
    }
    catch (NoSuchElementError){
	msg.reply("Sorry, something went wrong, this query does not have a normal google search page");
	//console.log("No such element");
    }

    //message the articles by their listing in the News page, 
    //up to 10 articles, or to num_articles.
    try {
	//googles news page has 3 articles under latest,
	//then followed by 7 more articles on the page,
	//the xpath to reach these elements is slightly different
	//and can be expressed in two for loops.
	let i = 1; //*[@id="rso"]/div[2]/g-card/div/div/div[2]/a
	for (i = 1; i <= num_articles && i <= 10; i++) {
	   let xpath = '//*[@id="rso"]/div[' + i + ']/g-card/div/div/div[2]/a';
	   let website = await driver.findElement(By.xpath(xpath)).getAttribute("href");
	    //await console.log(website);
	    await msg.channel.send(website);
	}
    }	
	
    catch (NoSuchElementError) {
	try { //sometimes when the news page has a "people also search bar" 
	      //and the user only requests 1 article it doesn't work.
	    let website = 
		await driver.findElement(By.xpath('//*[@id="rso"]/div[2]/g-card/div/div/div[2]/a')).getAttribute("href");
	    await msg.channel.send(website);
	} catch (NoSuchElementError){
	msg.reply("Sorry, something went wrong or this query has no relevant News page. Try adding 'news' at the end of your query.");
	}
	//console.log("No such news elements");
    }

    //quit when finished.
    driver.quit();
}


//top articles of the day command.
//If the user requests not a topic but the top articles of the day this
//command will spit out the most relevant articles of the day for each topic,
//top headline, US news, international, sports, and business. 
async function top_articles(msg) {
    /* Local Variables */
    let first_article = "";
    let second_article = "";
    let third_article = "";
    let fourth_article = "";
    let fifth_article = "";

    //direct driver to the google news main page.
    let driver = new Builder().forBrowser('safari').build();
    driver.manage().setTimeouts({implicit: 5000});
    await driver.get('https://news.google.com/topstories?hl=en-US&gl=US&ceid=US:en');
    
    try {
	//gets the top headline on googles news page.
	first_article = await driver.findElement(By.className("DY5T1d RZIKme")).getAttribute("href");

	//gets the second article, which will be the top US article
	await driver.get('https://news.google.com/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNRGxqTjNjd0VnSmxiaWdBUAE?hl=en-US&gl=US&ceid=US%3Aen');
	second_article = await driver.findElement(By.className("DY5T1d RZIKme")).getAttribute("href");

	//gets the third article, which will be the top international article
        await driver.get('https://news.google.com/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US%3Aen');
	third_article = await driver.findElement(By.className("DY5T1d RZIKme")).getAttribute("href");

	//this goes to ESPN, because googles sports page is wack, grabs top headline from there.
	await driver.get('https://www.espn.com');
	fourth_article = await driver.findElement(By.name("&lpos=fp:feed:1:coll:headlines:1")).getAttribute("href");

	//gets the fifth article which is in the business - economy section of the google page.
	await driver.get('https://www.cnbc.com/economy/');
	fifth_article = await driver.findElement(By.className("Card-title")).getAttribute("href");
}
    catch (NoSuchElementError) { //in case of error getting the articles 
	console.log("No Such element error");
	if (first_article.length == 0)
	    console.log("It was the first article");
	else if (second_article.length == 0)
	    console.log("It was the second article");
	else if (third_article.length == 0)
	    console.log("It was the third article");
	else if (fourth_article.length == 0)
	    console.log("It was the fourth article");
	else if (fifth_article.length == 0)
	    console.log("It was the fifth article");
}
    
    //spits out the messages to the user.
    await msg.channel.send("Top headline of the hour: " + first_article);
    await msg.channel.send("Top US article of the hour: " + second_article);
    await msg.channel.send("Top international article of the hour: " + third_article);
    await msg.channel.send("Top sports article of the hour: " + fourth_article);
    await msg.channel.send("Top economy article of the hour: " + fifth_article);

    /* DEBUGGING TOOLS
    console.log(first_article);
    console.log(second_article);
    console.log(third_article);
    console.log(fourth_article);
    console.log(fifth_article);
    */

//closes the driver.
    await driver.quit();
}


client.on('message', msg => {
	//creaetes an arry of strings that represents the message.
	let split_str = msg.content.split(" ");

	//info command so people can understand what the commands do and how to use them.  
	if (split_str[0] == ".newsinfo") {
	    msg.reply("Hi there! I am a Discord News Bot, brought to you with love from Maryland!");
	    msg.reply("Here are some of my commands that can be executed in any channel I have permissions to read and send messages in:");
	    msg.reply(' ".news top", returns the top 5 articles of the day in the US, International, Sports and Finance.');
	    msg.reply(' ".topic SUBJECT NUM_ARTICLES", returns NUM_ARTICLES articles specified for a given SUBJECT. NOTE: SUBJECT does not have to be one word, it can be seperated into as many words as necesasry.');
	    msg.reply(' ".schedule INTERVAL DURATION COMMAND ARGS", setups a scheduler that will cause me to perform one of my other commands specified by COMMAND (.news, .topic, .twitter) followed by args (top (for .news), SUBJECT NUM_ARTICLES (for .topic), etc.) every INTERVAL minutes for DURATION times');
	}

       	//run top_articles function
        if (split_str.length == 2 && split_str[0] == ".news" && split_str[1] == "top") {
	    msg.reply('A moment please...');
	    top_articles(msg);
	}

	//run grab_articles function 
	if (split_str[0] == ".topic" && split_str.length > 2) {
	    //number submitted by the user.
	    let num_articles = split_str[split_str.length-1], topic = "", i = 0;
	    //building the topic string.
	    for (i = 1; i < split_str.length-1; i++)
		topic += split_str[i] + " ";
	    topic.trim();
	    msg.reply('Finding ' + num_articles + ' relevant articles on ' + topic + '.');
	    grab_articles(msg, topic, num_articles);
	}

	//sets the schedule parameters.
	if (split_str[0] == ".schedule") {
	    let args = "";
	    for (i = 4; i < split_str.length; i++)
		args += split_str[i] + " ";
	    args.trim();
	    schedule_commands(msg, split_str[1], split_str[2], split_str[3], args);
	}
 });