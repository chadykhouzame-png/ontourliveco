export function LintTest() {
  return (
    <div className="bg-white text-black border-green-500">
      <span className={cn("bg-yellow-500", "text-red-500 hover:text-blue-600")} />
    </div>
  );
}

function cn(...classes: (string | false)[]) {
  return classes.filter(Boolean).join(" ");
}
