import Image from "next/image";

export default function Logo() {
  return (
    <>
      <Image
        src="/reeltrailer_logo.svg"
        alt="ReelTrailer Logo"
        width={150}
        height={44}
        loading="eager"
      />
    </>
  );
}
