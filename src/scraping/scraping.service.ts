import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios, { AxiosResponse, AxiosResponseHeaders } from 'axios';
import { HttpService } from '@nestjs/axios';
import * as puppeteer from 'puppeteer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScrapingService {
  constructor(private configService: ConfigService) {}
  //: Observable<AxiosResponse<any, any>>

  async findLikeCount(body) {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--window-size=1920,1080', '--disable-notifications'],
      userDataDir: '/Users/seongryongryu/Desktop/Areum_Insta/areum-insta-py',
      // '/Users/seongryongryu/Library/Application Support/Google/Chrome/Default',
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: 1080,
      height: 1080,
    });
    await page.goto('https://instagram.com');
    if (await page.$("a[href='/sr_ryu_s2/']")) {
      console.log('이미 로그인 되어 있습니다.');
    } else {
      await page.waitForSelector('input[name=username]');
      await page.type(
        'input[name=username]',
        this.configService.get<string>('INSTA_USERNAME'),
      );
      await page.type(
        'input[name=password]',
        this.configService.get<string>('INSTA_PASSWORD'),
      );
      await page.click('button.y3zKF');
      await page.waitForNavigation();
    }

    await page.goto(body.url);
    await page.setDefaultNavigationTimeout(0);
    await page.setDefaultTimeout(0);
    // await page.waitForNavigation();
    await page.waitForSelector('a[class=zV_Nj]');
    const post = await page.evaluate(() => {
      const name = document.querySelector('a.ZIAjV').textContent;
      const title = document.querySelector('.C4VMK > span').textContent;
      const likesData = document.querySelectorAll('a.zV_Nj')[1].textContent;
      const likes = Number(likesData.split(' ')[1].split('명')[0]) + 1;
      const originReplies = document.querySelectorAll('h3._6lAjh').length;
      const replyOfRepliesData = document.querySelectorAll('span.EizgU');
      let replies = originReplies;

      for (let i = 0; i < replyOfRepliesData.length; i++) {
        replies += Number(
          replyOfRepliesData[i].textContent.split('(')[1].split('개')[0],
        );
      }

      return {
        name,
        title,
        likes,
        replies,
      };
    });

    await page.goto('https://www.instagram.com/' + post.name);
    const followerData = await page.evaluate(() => {
      const followers = Number(
        document.querySelector('a.-nal3').textContent.split(' ')[1],
      );
      return { followers };
    });

    const { name, title, likes, replies } = post;
    const { followers } = followerData;

    return { name, title, likes, replies, followers };

    // const html = await axios.get(body.url);

    // let result = [];
    // const $ = cheerio.load(html.data);
    // // console.log($('a[class=zV_Nj]').html());
    // return $.root().html();
    // return $('a.zV_Nj').text();

    // for (let key in html) {
    //   result.push([key, html[key]]);
    // }

    // console.log(html, '\n', result, html.subscribe);
    // const $ = cheerio.load(html);
    // return { result: $.html() };
  }
}
