'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Caveat } from 'next/font/google';
import { TypeAnimation } from 'react-type-animation';

import { cn } from '~/lib/cn';
import { HappyMacMachine } from '~/components/HappyMacMachine';

const caveat = Caveat({ subsets: ['cyrillic'], weight: ['700'] });

const Title = () => {
  const [isHappyMacMachineShown, setIsHappyMacMachineShown] = useState(false);

  return (
    <div className="relative">
      <TypeAnimation
        sequence={['Contourify', () => setIsHappyMacMachineShown(true)]}
        wrapper="h1"
        cursor={false}
        className={cn(
          'bg-gradient-to-r from-amber-300 to-stone-50 bg-clip-text text-[176.152px] normal-case text-transparent'
        )}
      />

      {isHappyMacMachineShown && (
        <div className="absolute -right-10 -top-10 h-80 w-80">
          <HappyMacMachine />
        </div>
      )}
    </div>
  );
};

const Row1 = () => {
  return (
    <TypeAnimation
      sequence={['генератор картин за номерами']}
      wrapper="span"
      speed={85}
      cursor={false}
      className={cn('-mt-10 text-[80.7212px]', caveat.className)}
    />
  );
};

const Row2 = () => {
  const [isEmoteShown, setIsEmoteShown] = useState(false);

  return (
    <div className="relative">
      <TypeAnimation
        sequence={[
          'оберіть картинку і дозвольте генератору зробити магію',
          () => setIsEmoteShown(true)
        ]}
        wrapper="span"
        speed={85}
        cursor={false}
        className="text-[34.7887px]"
      />

      <Image
        src="https://cdn.7tv.app/emote/615b2ed36509781e29440804/4x.webp"
        className={cn(
          'absolute bottom-2 right-0 z-10 transition-opacity',
          isEmoteShown ? 'opacity-100' : 'opacity-0'
        )}
        width={60}
        height={60}
        alt="Picture of the author"
      />
    </div>
  );
};

export const HeroSection = () => {
  return (
    <div className="relative flex flex-col whitespace-nowrap font-bold uppercase leading-tight">
      <Title />

      <div className="flex flex-col font-medium">
        <Row1 />
        <Row2 />
      </div>
    </div>
  );
};
