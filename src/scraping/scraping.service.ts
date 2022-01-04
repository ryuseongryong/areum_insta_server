import { BadRequestException, Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import fs from 'fs';
import * as $csvWriter from 'csv-writer';
import { ConfigService } from '@nestjs/config';
import { CheckUrlDto } from './dto/check-url.dto';
import { CheckUrlArrDto } from './dto/check-urlArr.dto';

//! insta Many는 좋아요, 댓글, 팔로워, 좋아요+댓글(인게이지먼트), 이름 각각 표현
// 동영상일 때 skip 또는 조회수로 주기 등 구현
@Injectable()
export class ScrapingService {
  constructor(private configService: ConfigService) {}
  //: Observable<AxiosResponse<any, any>>

  async findLikeCount(body: CheckUrlDto) {
    if (!body.url) {
      throw new BadRequestException();
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
    if (await page.$("a[href='/nightingale.official/']")) {
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
    if (
      await page.evaluate(() => {
        if (document.querySelector('h2.l4b0S')) {
          return true;
        }
      })
    ) {
      await page.close();
      await browser.close();
      return {
        name: '제한된 페이지입니다.',
        followers: 0,
        likes: 0,
        replies: 0,
        engagements: 0,
      };
    }
    const normalPage = await page.waitForSelector('div[class=Nm9Fw]');

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
    const engagements = likes + replies;

    return { name, followers, likes, replies, engagements };
  }

  async findLikeCountSum(body: CheckUrlArrDto) {
    const { urlArr } = body;
    if (urlArr.length === 0) {
      throw new BadRequestException();
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
    if (await page.$("a[href='/nightingale.official/']")) {
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
      totalEngagements: number = 0,
      links: number = 0,
      errorPage: string;

    for (let i = 0; i < urlArr.length; i++) {
      await page.goto(body.urlArr[i]);
      if (
        await page.evaluate(() => {
          if (document.querySelector('h2.l4b0S')) {
            return true;
          }
        })
      ) {
        errorPage = errorPage + `, ${body.urlArr[i]}`;
        await page.waitForTimeout(2000);
      } else {
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
              const replyOfRepliesData =
                document.querySelectorAll('span.EizgU');
              for (let i = 0; i < replyOfRepliesData.length; i++) {
                replies += Number(
                  replyOfRepliesData[i].textContent
                    .split('(')[1]
                    .split('개')[0],
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
    }
    await page.close();
    await browser.close();
    totalEngagements = totalLikes + totalReplies;

    return {
      totalLikes,
      totalReplies,
      totalFollowers,
      totalEngagements,
      links,
      errorPage,
    };
  }

  async findLikeCountMany(body: CheckUrlArrDto) {
    const { urlArr } = body;
    if (urlArr.length === 0) {
      throw new BadRequestException();
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
    if (await page.$("a[href='/nightingale.official/']")) {
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
    type InstaObj = {
      link: string;
      username: string;
      likes: number;
      replies: number;
      engagements: number;
      followers: number;
    };

    const instaArr: Array<InstaObj> = [];
    const fileData = [];
    let totalFollowers: number = 0,
      totalLikes: number = 0,
      totalReplies: number = 0,
      totalEngagements: number = 0;

    for (let i = 0; i < urlArr.length; i++) {
      const instaObj: InstaObj = {
        link: 'http://instagram.com',
        username: '',
        likes: 0,
        replies: 0,
        engagements: 0,
        followers: 0,
      };
      await page.goto(urlArr[i]);
      if (
        await page.evaluate(() => {
          if (document.querySelector('h2.l4b0S')) {
            return true;
          }
        })
      ) {
        await page.waitForTimeout(2000);
      } else {
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
              const replyOfRepliesData =
                document.querySelectorAll('span.EizgU');
              for (let i = 0; i < replyOfRepliesData.length; i++) {
                replies += Number(
                  replyOfRepliesData[i].textContent
                    .split('(')[1]
                    .split('개')[0],
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

        instaObj.link = urlArr[i];
        instaObj.username = name;
        instaObj.followers = followers;
        instaObj.likes = likes;
        instaObj.replies = replies;
        instaObj.engagements = likes + replies;

        totalFollowers += followers;
        totalLikes += likes;
        totalReplies += replies;
        totalEngagements += likes + replies;

        instaArr.push(instaObj);
        fileData.push(instaObj);
      }
    }
    instaArr.push({
      link: '합계',
      username: '',
      followers: totalFollowers,
      likes: totalLikes,
      replies: totalReplies,
      engagements: totalEngagements,
    });
    fileData.push({
      link: '합계',
      username: '',
      followers: totalFollowers,
      likes: totalLikes,
      replies: totalReplies,
      engagements: totalEngagements,
    });
    await page.close();
    await browser.close();

    const date = new Date().toLocaleString();
    const fileName = `${this.configService.get<string>('FILEPATH') + date}.csv`;
    const headerColums = [
      {
        id: 'link',
        title: 'link',
      },
      {
        id: 'username',
        title: 'username',
      },
      {
        id: 'followers',
        title: 'followers',
      },
      {
        id: 'likes',
        title: 'likes',
      },
      {
        id: 'replies',
        title: 'replies',
      },
      {
        id: 'engagements',
        title: 'engagements',
      },
    ];

    const createCW = $csvWriter.createObjectCsvWriter;
    const csvWriter = createCW({
      path: fileName,
      header: headerColums,
    });
    csvWriter.writeRecords(instaArr).then(() => {
      console.log('file saved!');
    });

    return { instaArr };
  }
}
