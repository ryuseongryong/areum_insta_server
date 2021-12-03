import { Injectable, NotFoundException } from '@nestjs/common';
import * as cheerio from 'cheerio';
import axios, { AxiosResponse, AxiosResponseHeaders } from 'axios';
import { HttpService } from '@nestjs/axios';
import * as puppeteer from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { throwIfEmpty } from 'rxjs';
import { CheckUrlDto } from './dto/check-url.dto';
import { CheckUrlArrDto } from './dto/check-urlArr.dto';

@Injectable()
export class ScrapingService {
  constructor(private configService: ConfigService) {}
  //: Observable<AxiosResponse<any, any>>

  async findLikeCount(body: CheckUrlDto) {
    if (!body.url) {
      throw new NotFoundException();
    }
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--window-size=1920,1080', '--disable-notifications'],
      userDataDir: this.configService.get<string>('USERDATADIRECTORY'),
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
    // await page.setDefaultNavigationTimeout(0);
    // await page.setDefaultTimeout(0);
    // await page.waitForNavigation();

    console.log('first...');
    // await page.waitForSelector('a[class=zV_Nj]');
    await page.waitForSelector('div[class=Nm9Fw]');
    // 댓글 더보기 클릭하기
    const moreReply = await page.$('div.NUiEW > button.wpO6b');
    if (moreReply) {
      await page.evaluate((btn) => btn.click(), moreReply);
    }
    const post = await page.evaluate(() => {
      // likes와 replies가 0인 경우 확인
      let likesData: string, likes: number;
      const name = document.querySelector('a.ZIAjV').textContent;
      const title = document.querySelector('.C4VMK > span').textContent;
      const originReplies = document.querySelectorAll('ul.Mr508').length;
      let replies = originReplies;
      if (document.querySelectorAll('a.zV_Nj').length === 0) {
        likes = 0;
      } else {
        likesData = document
          .querySelectorAll('div.Nm9Fw > a.zV_Nj')[0]
          .textContent.split(' ')[1];

        if (likesData.includes(',')) {
          let temp = '';
          for (let i = 0; i < likesData.split(',').length; i++) {
            temp += likesData.split(',')[i];
          }
          likesData = temp;
        }
        if (document.querySelectorAll('a.zV_Nj').length === 1) {
          likes = Number(likesData.split('개')[0]);
        } else {
          likes = Number(likesData.split('명')[0]) + 1;
        }
      }
      if (originReplies !== 0) {
        if (originReplies) {
          const replyOfRepliesData = document.querySelectorAll('span.EizgU');
          for (let i = 0; i < replyOfRepliesData.length; i++) {
            replies += Number(
              replyOfRepliesData[i].textContent.split('(')[1].split('개')[0],
            );
          }
        }
      }

      return {
        name,
        title,
        likes,
        replies,
      };
    });
    console.log('second...');

    await page.goto('https://www.instagram.com/' + post.name);
    await page.waitForSelector('footer');
    // await page.waitForSelector('ul[class=k9GMp]');
    console.log('page change....');

    const followerData = await page.evaluate(() => {
      // follower ','가 있는 경우
      const followersData = document
        .querySelectorAll('ul.k9GMp > li.Y8-fY > a.-nal3')[0]
        .textContent.split(' ')[1];
      let followers: number;

      // 천, 백만
      if (followersData.includes('천')) {
        followers = Number(followersData.split('천')[0]) * 1000;
      } else if (followersData.includes('백만')) {
        followers = Number(followersData.split('백만')[0]) * 1000000;
      } else if (followersData.includes(',')) {
        followers = Number(
          followersData.split(',')[0] + followersData.split(',')[1],
        );
      } else {
        followers = Number(followersData);
      }
      return { followers };
    });
    await page.close();
    await browser.close();

    const { name, title, likes, replies } = post;
    const { followers } = followerData;

    return { name, title, likes, replies, followers };
  }

  async findLikeCountMany(body: CheckUrlArrDto) {
    const { urlArr } = body;
    if (urlArr.length === 0) {
      throw new NotFoundException();
    }

    const browser = await puppeteer.launch({
      headless: false,
      args: ['--window-size=1920,1080', '--disable-notifications'],
      userDataDir: this.configService.get<string>('USERDATADIRECTORY'),
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
    let totalLikes: number = 0,
      totalReplies: number = 0,
      totalFollowers: number = 0,
      links: number = 0;

    for (let i = 0; i < urlArr.length; i++) {
      await page.goto(body.urlArr[i]);
      await page.waitForSelector('div[class=Nm9Fw]');
      await page.waitForTimeout(2000);
      // 댓글 더보기 클릭하기
      const moreReply = await page.$('div.NUiEW > button.wpO6b');
      if (moreReply) {
        await page.evaluate((btn) => btn.click(), moreReply);
      }
      const post = await page.evaluate(() => {
        // likes와 replies가 0인 경우 확인
        let likesData: string, likes: number;
        const name = document.querySelector('a.ZIAjV').textContent;
        const originReplies = document.querySelectorAll('ul.Mr508').length;
        let replies = originReplies;
        if (document.querySelectorAll('a.zV_Nj').length === 0) {
          likes = 0;
        } else {
          likesData = document
            .querySelectorAll('div.Nm9Fw > a.zV_Nj')[0]
            .textContent.split(' ')[1];

          if (likesData.includes(',')) {
            let temp = '';
            for (let i = 0; i < likesData.split(',').length; i++) {
              temp += likesData.split(',')[i];
            }
            likesData = temp;
          }
          if (document.querySelectorAll('a.zV_Nj').length === 1) {
            likes = Number(likesData.split('개')[0]);
          } else {
            likes = Number(likesData.split('명')[0]) + 1;
          }
        }
        if (originReplies !== 0) {
          if (originReplies) {
            const replyOfRepliesData = document.querySelectorAll('span.EizgU');
            for (let i = 0; i < replyOfRepliesData.length; i++) {
              replies += Number(
                replyOfRepliesData[i].textContent.split('(')[1].split('개')[0],
              );
            }
          }
        }

        return {
          name,
          likes,
          replies,
        };
      });
      await page.goto('https://www.instagram.com/' + post.name);
      // await page.waitForSelector('ul[class=k9GMp]');
      await page.waitForSelector('footer');
      await page.waitForTimeout(2000);
      console.log('page change....');
      const followerData = await page.evaluate(() => {
        // follower ','가 있는 경우
        const followersData = document
          .querySelectorAll('ul.k9GMp > li.Y8-fY > a.-nal3')[0]
          .textContent.split(' ')[1];
        let followers: number;

        // 천, 백만
        if (followersData.includes('천')) {
          followers = Number(followersData.split('천')[0]) * 1000;
        } else if (followersData.includes('백만')) {
          followers = Number(followersData.split('백만')[0]) * 1000000;
        } else if (followersData.includes(',')) {
          followers = Number(
            followersData.split(',')[0] + followersData.split(',')[1],
          );
        } else {
          followers = Number(followersData);
        }
        return { followers };
      });
      const { name, likes, replies } = post;
      const { followers } = followerData;
      totalLikes += likes;
      totalReplies += replies;
      totalFollowers += followers;
      links += 1;
      console.log(links);
    }
    await page.close();
    await browser.close();

    return { totalLikes, totalReplies, totalFollowers, links };
  }
}
